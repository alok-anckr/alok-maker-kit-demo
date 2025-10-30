import { enhanceRouteHandler } from '@kit/next/routes';
import { getLogger } from '@kit/shared/logger';
import { NextResponse } from 'next/server';

import { createConductorService } from '~/lib/quickbooks/conductor.service';
import {
  GetCustomerSchema,
  UpdateCustomerSchema,
} from '~/lib/quickbooks/schemas';

/**
 * @name GET
 * @description Get a single customer from QuickBooks Desktop
 * @route GET /api/quickbooks/customers/[id]
 */
export const GET = enhanceRouteHandler(
  async ({ params }) => {
    const logger = await getLogger();

    const ctx = {
      name: 'api.quickbooks.customers.get',
    };

    logger.info(ctx, 'Fetching QuickBooks Desktop customer...');

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

      const { id: customerId } = await params;

      // Validate parameters
      const validatedParams = GetCustomerSchema.parse({
        customerId,
      });

      const service = createConductorService();

      const customer = await service.getCustomer({
        endUserId,
        customerId: validatedParams.customerId,
      });

      logger.info(
        { ...ctx, customerId: customer.id },
        'Successfully fetched customer',
      );

      return NextResponse.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to fetch customer');

      if (error instanceof Error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            userFacingMessage:
              'Failed to fetch customer from QuickBooks. Please ensure QuickBooks Desktop is running and the correct company file is open.',
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
 * @name PATCH
 * @description Update a customer in QuickBooks Desktop
 * @route PATCH /api/quickbooks/customers/[id]
 */
export const PATCH = enhanceRouteHandler(
  async ({ body, params }) => {
    const logger = await getLogger();

    const ctx = {
      name: 'api.quickbooks.customers.update',
    };

    logger.info(ctx, 'Updating QuickBooks Desktop customer...');

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

      const { id } = await params;
      const customerId = id;

      if (!customerId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Customer ID is required',
          },
          { status: 400 },
        );
      }

      const {
        revisionNumber,
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

      const service = createConductorService();

      const updatedCustomer = await service.updateCustomer({
        endUserId,
        customerId,
        revisionNumber,
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
        { ...ctx, customerId: updatedCustomer.id },
        'Successfully updated customer',
      );

      return NextResponse.json({
        success: true,
        data: updatedCustomer,
        message: 'Customer updated successfully',
      });
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to update customer');

      if (error instanceof Error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            userFacingMessage:
              'Failed to update customer in QuickBooks. Please ensure QuickBooks Desktop is running and the correct company file is open.',
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
    schema: UpdateCustomerSchema.omit({ customerId: true }),
  },
);

