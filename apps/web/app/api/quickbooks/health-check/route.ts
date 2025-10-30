import { enhanceRouteHandler } from '@kit/next/routes';
import { getLogger } from '@kit/shared/logger';
import { NextResponse } from 'next/server';

import { createConductorService } from '~/lib/quickbooks/conductor.service';
import { HealthCheckSchema } from '~/lib/quickbooks/schemas';

/**
 * @name GET
 * @description Check QuickBooks Desktop connection health
 * @route GET /api/quickbooks/health-check
 */
export const GET = enhanceRouteHandler(
  async () => {
    const logger = await getLogger();

    const ctx = {
      name: 'api.quickbooks.healthCheck',
    };

    logger.info(ctx, 'Performing QuickBooks Desktop health check...');

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
            status: 'error',
            error: 'QuickBooks configuration is missing',
            userFacingMessage:
              'QuickBooks integration is not properly configured. Please contact support.',
          },
          { status: 500 },
        );
      }

      const service = createConductorService();
      const healthCheck = await service.healthCheck(endUserId);

      logger.info(
        { ...ctx, status: healthCheck.status, duration: healthCheck.duration },
        'Health check successful',
      );

      return NextResponse.json({
        success: true,
        status: healthCheck.status,
        duration: healthCheck.duration,
        message:
          'QuickBooks Desktop connection is active and ready to process requests',
      });
    } catch (error) {
      logger.error({ ...ctx, error }, 'Health check failed');

      if (error instanceof Error) {
        return NextResponse.json(
          {
            success: false,
            status: 'error',
            error: error.message,
            userFacingMessage:
              'Cannot connect to QuickBooks Desktop. Please ensure QuickBooks is running, the correct company file is open, and no modal dialogs are blocking the connection.',
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          status: 'error',
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

