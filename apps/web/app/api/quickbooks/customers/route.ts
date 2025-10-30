import { enhanceRouteHandler } from '@kit/next/routes';
import { getLogger } from '@kit/shared/logger';
import { NextResponse } from 'next/server';

import { createConductorService } from '~/lib/quickbooks/conductor.service';
import {
  CreateCustomerSchema,
  ListCustomersSchema,
} from '~/lib/quickbooks/schemas';

/**
 * @name GET
 * @description List customers from QuickBooks Desktop
 * @route GET /api/quickbooks/customers?limit={limit}&cursor={cursor}
 */
export const GET = enhanceRouteHandler(
  async ({ request }) => {
    const logger = await getLogger();

    const ctx = {
      name: 'api.quickbooks.customers.list',
    };

    logger.info(ctx, 'Listing QuickBooks Desktop customers...');

    try {
      // Get endUserId from environment variable
      const endUserId = process.env.CONDUCTOR_END_USER_ID;

      if (!endUserId) {
        logger.error(
          { ...ctx },
          'CONDUCTOR_END_USER_ID environment variable is not set',
        );

        return NextResponse.json(
          {
            success: false,
            error: 'QuickBooks configuration is missing',
            userFacingMessage:
              'QuickBooks integration is not properly configured. Please contact support.',
          },
          { status: 500 },
        );
      }

      const url = new URL(request.url);
      const limit = url.searchParams.get('limit');
      const cursor = url.searchParams.get('cursor');

      // Validate query parameters
      const params = ListCustomersSchema.parse({
        limit: limit ? Number(limit) : undefined,
        cursor: cursor ?? undefined,
      });

      const service = createConductorService();

      const customers = await service.listCustomers({
        endUserId,
        limit: params.limit,
        cursor: params.cursor,
      });

      logger.info(
        { ...ctx, count: customers.data?.length },
        'Successfully listed customers',
      );

      return NextResponse.json({
        success: true,
        data: customers.data,
        nextCursor: customers.nextCursor,
      });
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to list customers');

      if (error instanceof Error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            userFacingMessage:
              'Failed to fetch customers from QuickBooks. Please ensure QuickBooks Desktop is running and the correct company file is open.',
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'An unexpected error occurred',
        },
        { status: 500 },
      );
    }
  },
  {
    auth: false, // Authentication disabled for easier testing
  },
);

/**
 * @name POST
 * @description Create a new customer in QuickBooks Desktop
 * @route POST /api/quickbooks/customers
 */
export const POST = enhanceRouteHandler(
  async ({ body }) => {
    const logger = await getLogger();

    const ctx = {
      name: 'api.quickbooks.customers.create',
    };

    logger.info(ctx, 'Creating QuickBooks Desktop customer...');

    try {
      // Get endUserId from environment variable
      const endUserId = process.env.CONDUCTOR_END_USER_ID;

      if (!endUserId) {
        logger.error(
          { ...ctx },
          'CONDUCTOR_END_USER_ID environment variable is not set',
        );

        return NextResponse.json(
          {
            success: false,
            error: 'QuickBooks configuration is missing',
            userFacingMessage:
              'QuickBooks integration is not properly configured. Please contact support.',
          },
          { status: 500 },
        );
      }

      const service = createConductorService();

      const {
        name,
        firstName,
        lastName,
        companyName,
        email,
        phone,
        fax,
        billingAddress,
        shippingAddress,
        note,
        isActive,
      } = body;

      const newCustomer = await service.createCustomer({
        endUserId,
        customer: {
          name,
          firstName,
          lastName,
          companyName,
          email,
          phone,
          fax,
          billingAddress,
          shippingAddress,
          note,
          isActive,
        },
      });

      logger.info(
        { ...ctx, customerId: newCustomer.id },
        'Successfully created customer',
      );

      return NextResponse.json(
        {
          success: true,
          data: newCustomer,
          message: 'Customer created successfully',
        },
        { status: 201 },
      );
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to create customer');

      if (error instanceof Error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            userFacingMessage:
              'Failed to create customer in QuickBooks. Please ensure QuickBooks Desktop is running and the correct company file is open.',
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'An unexpected error occurred',
        },
        { status: 500 },
      );
    }
  },
  {
    auth: false, // Authentication disabled for easier testing
    schema: CreateCustomerSchema,
  },
);

