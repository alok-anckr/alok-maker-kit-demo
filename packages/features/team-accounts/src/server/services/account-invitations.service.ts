import 'server-only';

import { SupabaseClient } from '@supabase/supabase-js';

import { addDays, formatISO } from 'date-fns';
import { z } from 'zod';

import { getLogger } from '@kit/shared/logger';
import { Database } from '@kit/supabase/database';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { DeleteInvitationSchema } from '../../schema/delete-invitation.schema';
import type { InviteMembersSchema } from '../../schema/invite-members.schema';
import type { UpdateInvitationSchema } from '../../schema/update-invitation.schema';
import { createAccountInvitationsDispatchService } from './account-invitations-dispatcher.service';

/**
 *
 * Create an account invitations service.
 */
export function createAccountInvitationsService(
  client: SupabaseClient<Database>,
) {
  return new AccountInvitationsService(client);
}

/**
 * @name AccountInvitationsService
 * @description Service for managing account invitations.
 */
class AccountInvitationsService {
  private readonly namespace = 'invitations';

  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * @name deleteInvitation
   * @description Removes an invitation from the database.
   * @param params
   */
  async deleteInvitation(params: z.infer<typeof DeleteInvitationSchema>) {
    const logger = await getLogger();

    const ctx = {
      name: this.namespace,
      ...params,
    };

    logger.info(ctx, 'Removing invitation...');

    const { data, error } = await this.client
      .from('invitations')
      .delete()
      .match({
        id: params.invitationId,
      });

    if (error) {
      logger.error(ctx, `Failed to remove invitation`);

      throw error;
    }

    logger.info(ctx, 'Invitation successfully removed');

    return data;
  }

  /**
   * @name updateInvitation
   * @param params
   * @description Updates an invitation in the database.
   */
  async updateInvitation(params: z.infer<typeof UpdateInvitationSchema>) {
    const logger = await getLogger();

    const ctx = {
      name: this.namespace,
      ...params,
    };

    logger.info(ctx, 'Updating invitation...');

    const { data, error } = await this.client
      .from('invitations')
      .update({
        role: params.role,
      })
      .match({
        id: params.invitationId,
      });

    if (error) {
      logger.error(
        {
          ...ctx,
          error,
        },
        'Failed to update invitation',
      );

      throw error;
    }

    logger.info(ctx, 'Invitation successfully updated');

    return data;
  }

  async validateInvitation(
    invitation: z.infer<typeof InviteMembersSchema>['invitations'][number],
    accountSlug: string,
  ) {
    const { data: members, error } = await this.client.rpc(
      'get_account_members',
      {
        account_slug: accountSlug,
      },
    );

    if (error) {
      throw error;
    }

    const isUserAlreadyMember = members.find((member) => {
      return member.email === invitation.email;
    });

    if (isUserAlreadyMember) {
      throw new Error('User already member of the team');
    }
  }

  /**
   * @name sendInvitations
   * @description Sends invitations to join a team.
   * @param accountSlug
   * @param invitations
   */
  async sendInvitations({
    accountSlug,
    invitations,
  }: {
    invitations: z.infer<typeof InviteMembersSchema>['invitations'];
    accountSlug: string;
  }) {
    const logger = await getLogger();

    const ctx = {
      accountSlug,
      name: this.namespace,
    };

    logger.info(ctx, 'Storing invitations...');

    try {
      await Promise.all(
        invitations.map((invitation) =>
          this.validateInvitation(invitation, accountSlug),
        ),
      );
    } catch (error) {
      logger.error(
        {
          ...ctx,
          error: (error as Error).message,
        },
        'Error validating invitations',
      );

      throw error;
    }

    const accountResponse = await this.client
      .from('accounts')
      .select('name')
      .eq('slug', accountSlug)
      .single();

    if (!accountResponse.data) {
      logger.error(
        ctx,
        'Account not found in database. Cannot send invitations.',
      );

      throw new Error('Account not found');
    }

    const response = await this.client.rpc('add_invitations_to_account', {
      invitations,
      account_slug: accountSlug,
    });

    if (response.error) {
      logger.error(
        {
          ...ctx,
          error: response.error,
        },
        `Failed to add invitations to account ${accountSlug}`,
      );

      throw response.error;
    }

    const responseInvitations = Array.isArray(response.data)
      ? response.data
      : [response.data];

    logger.info(
      {
        ...ctx,
        count: responseInvitations.length,
      },
      'Invitations added to account',
    );

    await this.dispatchInvitationEmails(ctx, responseInvitations);
  }

  /**
   * @name acceptInvitationToTeam
   * @description Accepts an invitation to join a team.
   */
  async acceptInvitationToTeam(
    adminClient: SupabaseClient<Database>,
    params: {
      userId: string;
      userEmail: string;
      inviteToken: string;
    },
  ) {
    const logger = await getLogger();

    const ctx = {
      name: this.namespace,
      ...params,
    };

    logger.info(ctx, 'Accepting invitation to team');

    const invitation = await adminClient
      .from('invitations')
      .select('email')
      .eq('invite_token', params.inviteToken)
      .single();

    if (invitation.error) {
      logger.error(
        {
          ...ctx,
          error: invitation.error,
        },
        'Failed to get invitation',
      );
    }

    // if the invitation email does not match the user email, throw an error
    if (invitation.data?.email !== params.userEmail) {
      logger.error({
        ...ctx,
        error: 'Invitation email does not match user email',
      });
    }

    const { error, data } = await adminClient.rpc('accept_invitation', {
      token: params.inviteToken,
      user_id: params.userId,
    });

    if (error) {
      logger.error(
        {
          ...ctx,
          error,
        },
        'Failed to accept invitation to team',
      );

      throw error;
    }

    logger.info(ctx, 'Successfully accepted invitation to team');

    return data;
  }

  /**
   * @name renewInvitation
   * @description Renews an invitation to join a team by extending the expiration date by 7 days.
   * @param invitationId
   */
  async renewInvitation(invitationId: number) {
    const logger = await getLogger();

    const ctx = {
      invitationId,
      name: this.namespace,
    };

    logger.info(ctx, 'Renewing invitation...');

    const sevenDaysFromNow = formatISO(addDays(new Date(), 7));

    const { data, error } = await this.client
      .from('invitations')
      .update({
        expires_at: sevenDaysFromNow,
      })
      .match({
        id: invitationId,
      });

    if (error) {
      logger.error(
        {
          ...ctx,
          error,
        },
        'Failed to renew invitation',
      );

      throw error;
    }

    logger.info(ctx, 'Invitation successfully renewed');

    return data;
  }

  /**
   * @name dispatchInvitationEmails
   * @description Dispatches invitation emails to the invited users.
   * @param ctx
   * @param invitations
   * @returns
   */
  private async dispatchInvitationEmails(
    ctx: { accountSlug: string; name: string },
    invitations: Database['public']['Tables']['invitations']['Row'][],
  ) {
    if (!invitations.length) {
      return;
    }

    const logger = await getLogger();
    const adminClient = getSupabaseServerAdminClient();
    const service = createAccountInvitationsDispatchService(this.client);

    const results = await Promise.allSettled(
      invitations.map(async (invitation) => {
        const joinTeamLink = service.getInvitationLink(invitation.invite_token);
        const authCallbackUrl = service.getAuthCallbackUrl(joinTeamLink);

        const getEmailLinkType = async () => {
          const user = await adminClient
            .from('accounts')
            .select('*')
            .eq('email', invitation.email)
            .single();

          // if the user is not found, return the invite type
          // this link allows the user to register to the platform
          if (user.error || !user.data) {
            return 'invite';
          }

          // if the user is found, return the email link type to sign in
          return 'magiclink';
        };

        const emailLinkType = await getEmailLinkType();

        // generate an invitation link with Supabase admin client
        // use the "redirectTo" parameter to redirect the user to the invitation page after the link is clicked
        const generateLinkResponse = await adminClient.auth.admin.generateLink({
          email: invitation.email,
          type: emailLinkType,
        });

        // if the link generation fails, throw an error
        if (generateLinkResponse.error) {
          logger.error(
            {
              ...ctx,
              error: generateLinkResponse.error,
            },
            'Failed to generate link',
          );

          throw generateLinkResponse.error;
        }

        // get the link from the response
        const verifyLink = generateLinkResponse.data.properties?.action_link;

        // extract token
        const token = new URL(verifyLink).searchParams.get('token');

        if (!token) {
          // return error
          throw new Error(
            'Token in verify link from Supabase Auth was not found',
          );
        }

        // add search params to be consumed by /auth/confirm route
        authCallbackUrl.searchParams.set('token_hash', token);
        authCallbackUrl.searchParams.set('type', emailLinkType);

        const link = authCallbackUrl.href;

        // send the invitation email
        const data = await service.sendInvitationEmail({
          invitation,
          link,
        });

        // return the result
        return {
          id: invitation.id,
          data,
        };
      }),
    );

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value.data.success) {
        logger.error(
          {
            ...ctx,
            invitationId:
              result.status === 'fulfilled' ? result.value.id : result.reason,
          },
          'Failed to send invitation email',
        );
      }
    }

    const succeeded = results.filter(
      (result) => result.status === 'fulfilled' && result.value.data.success,
    );

    if (succeeded.length) {
      logger.info(
        {
          ...ctx,
          count: succeeded.length,
        },
        'Invitation emails successfully sent!',
      );
    }
  }
}
