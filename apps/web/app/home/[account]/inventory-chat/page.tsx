import { use } from 'react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { InventoryChatContainer } from './_components/inventory-chat-container';

interface InventoryChatPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('teams:inventoryChat.pageTitle');

  return {
    title,
  };
};

function InventoryChatPage({ params }: InventoryChatPageProps) {
  const account = use(params).account;

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common:routes.inventoryChat'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody className="h-[calc(100vh-200px)]">
        <InventoryChatContainer />
      </PageBody>
    </>
  );
}

export default withI18n(InventoryChatPage);
