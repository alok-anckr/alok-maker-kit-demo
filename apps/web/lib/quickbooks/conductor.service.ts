import 'server-only';

import Conductor from 'conductor-node';

import { getLogger } from '@kit/shared/logger';

/**
 * Conductor Service for QuickBooks Desktop operations
 * @description This service provides methods to interact with QuickBooks Desktop via Conductor SDK
 */
class ConductorService {
  private conductor: Conductor;

  constructor() {
    const apiKey = process.env.CONDUCTOR_API_KEY;

    if (!apiKey) {
      throw new Error(
        'CONDUCTOR_API_KEY environment variable is not set. Please add it to your .env file.',
      );
    }

    this.conductor = new Conductor({
      apiKey,
    });
  }

  /**
   * Check QuickBooks Desktop connection health
   */
  async healthCheck(endUserId: string) {
    const logger = await getLogger();

    const ctx = {
      name: 'conductor.healthCheck',
      endUserId,
    };

    logger.info(ctx, 'Checking QuickBooks Desktop connection...');

    try {
      const response = await this.conductor.qbd.healthCheck({
        conductorEndUserId: endUserId,
      });

      logger.info(ctx, 'Health check successful');

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Health check failed');
      throw error;
    }
  }

  /**
   * List customers from QuickBooks Desktop
   */
  async listCustomers(params: {
    endUserId: string;
    limit?: number;
    cursor?: string;
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'conductor.listCustomers',
      endUserId: params.endUserId,
    };

    logger.info(ctx, 'Fetching customers from QuickBooks Desktop...');

    try {
      const page = await this.conductor.qbd.customers.list({
        conductorEndUserId: params.endUserId,
        limit: params.limit,
        cursor: params.cursor,
      });

      logger.info(
        { ...ctx, count: page.data?.length },
        'Successfully fetched customers',
      );

      return {
        data: page.data,
        nextCursor: page.nextCursor,
      };
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to fetch customers');
      throw error;
    }
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(params: { endUserId: string; customerId: string }) {
    const logger = await getLogger();

    const ctx = {
      name: 'conductor.getCustomer',
      endUserId: params.endUserId,
      customerId: params.customerId,
    };

    logger.info(ctx, 'Fetching customer from QuickBooks Desktop...');

    try {
      const response = await this.conductor.qbd.customers.retrieve(
        params.customerId,
        {
          conductorEndUserId: params.endUserId,
        },
      );

      logger.info(ctx, 'Successfully fetched customer');

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to fetch customer');
      throw error;
    }
  }

  /**
   * Create a new customer in QuickBooks Desktop
   */
  async createCustomer(params: {
    endUserId: string;
    customer: {
      name: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      email?: string;
      phone?: string;
      fax?: string;
      billingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      shippingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      note?: string;
      isActive?: boolean;
    };
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'conductor.createCustomer',
      endUserId: params.endUserId,
    };

    logger.info(ctx, 'Creating customer in QuickBooks Desktop...');

    try {
      const response = await this.conductor.qbd.customers.create({
        conductorEndUserId: params.endUserId,
        ...params.customer,
      });

      logger.info(
        { ...ctx, customerId: response.id },
        'Successfully created customer',
      );

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to create customer');
      throw error;
    }
  }

  /**
   * Update an existing customer in QuickBooks Desktop
   */
  async updateCustomer(params: {
    endUserId: string;
    customerId: string;
    revisionNumber: string;
    customer: {
      name?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      email?: string;
      phone?: string;
      fax?: string;
      billingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      shippingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      note?: string;
      isActive?: boolean;
    };
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'conductor.updateCustomer',
      endUserId: params.endUserId,
      customerId: params.customerId,
    };

    logger.info(ctx, 'Updating customer in QuickBooks Desktop...');

    try {
      const response = await this.conductor.qbd.customers.update(
        params.customerId,
        {
          conductorEndUserId: params.endUserId,
          revisionNumber: params.revisionNumber,
          ...params.customer,
        },
      );

      logger.info(ctx, 'Successfully updated customer');

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to update customer');
      throw error;
    }
  }
}

/**
 * Factory function to create a new Conductor service instance
 * @returns ConductorService instance
 */
export function createConductorService() {
  return new ConductorService();
}

