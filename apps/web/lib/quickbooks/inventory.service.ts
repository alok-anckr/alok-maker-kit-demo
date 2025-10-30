import 'server-only';

import Conductor from 'conductor-node';

import { getLogger } from '@kit/shared/logger';

import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  ListInventoryItemsInput,
  CreateInventoryAdjustmentInput,
} from './inventory-schemas';

/**
 * Inventory Service for QuickBooks Desktop operations
 * @description This service provides methods to interact with QuickBooks Desktop inventory items via Conductor SDK
 */
class InventoryService {
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
   * List inventory items from QuickBooks Desktop
   */
  async listInventoryItems(params: {
    endUserId: string;
    filters?: Partial<ListInventoryItemsInput>;
    fetchAll?: boolean;
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'inventory.listInventoryItems',
      endUserId: params.endUserId,
    };

    logger.info(ctx, 'Fetching inventory items from QuickBooks Desktop...');

    try {
      // If fetchAll is true, recursively fetch all pages
      if (params.fetchAll) {
        const allItems: any[] = [];
        let cursor: string | undefined = params.filters?.cursor;
        let hasMore = true;

        while (hasMore) {
          const page = await this.conductor.qbd.inventoryItems.list({
            conductorEndUserId: params.endUserId,
            limit: params.filters?.limit || 100,
            cursor,
            ids: params.filters?.ids,
            fullNames: params.filters?.fullNames,
            status: params.filters?.status,
            updatedAfter: params.filters?.updatedAfter,
            updatedBefore: params.filters?.updatedBefore,
            nameContains: params.filters?.nameContains,
            nameStartsWith: params.filters?.nameStartsWith,
            nameEndsWith: params.filters?.nameEndsWith,
            nameFrom: params.filters?.nameFrom,
            nameTo: params.filters?.nameTo,
            classIds: params.filters?.classIds,
          });

          allItems.push(...(page.data || []));
          cursor = page.nextCursor ?? undefined;
          hasMore = !!cursor;

          logger.info(
            { ...ctx, currentCount: allItems.length, hasMore },
            'Fetching page of inventory items...',
          );
        }

        logger.info(
          { ...ctx, totalCount: allItems.length },
          'Successfully fetched all inventory items',
        );

        return {
          data: allItems,
          nextCursor: undefined,
        };
      }

      // Single page fetch
      const page = await this.conductor.qbd.inventoryItems.list({
        conductorEndUserId: params.endUserId,
        limit: params.filters?.limit,
        cursor: params.filters?.cursor,
        ids: params.filters?.ids,
        fullNames: params.filters?.fullNames,
        status: params.filters?.status,
        updatedAfter: params.filters?.updatedAfter,
        updatedBefore: params.filters?.updatedBefore,
        nameContains: params.filters?.nameContains,
        nameStartsWith: params.filters?.nameStartsWith,
        nameEndsWith: params.filters?.nameEndsWith,
        nameFrom: params.filters?.nameFrom,
        nameTo: params.filters?.nameTo,
        classIds: params.filters?.classIds,
      });

      logger.info(
        { ...ctx, count: page.data?.length },
        'Successfully fetched inventory items',
      );

      return {
        data: page.data,
        nextCursor: page.nextCursor,
      };
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to fetch inventory items');
      throw error;
    }
  }

  /**
   * Get a single inventory item by ID
   */
  async getInventoryItem(params: { endUserId: string; itemId: string }) {
    const logger = await getLogger();

    const ctx = {
      name: 'inventory.getInventoryItem',
      endUserId: params.endUserId,
      itemId: params.itemId,
    };

    logger.info(ctx, 'Fetching inventory item from QuickBooks Desktop...');

    try {
      const response = await this.conductor.qbd.inventoryItems.retrieve(
        params.itemId,
        {
          conductorEndUserId: params.endUserId,
        },
      );

      logger.info(ctx, 'Successfully fetched inventory item');

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to fetch inventory item');
      throw error;
    }
  }

  /**
   * Create a new inventory item in QuickBooks Desktop
   */
  async createInventoryItem(params: {
    endUserId: string;
    item: CreateInventoryItemInput;
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'inventory.createInventoryItem',
      endUserId: params.endUserId,
    };

    logger.info(ctx, 'Creating inventory item in QuickBooks Desktop...');

    try {
      const response = await this.conductor.qbd.inventoryItems.create({
        conductorEndUserId: params.endUserId,
        ...params.item,
      });

      logger.info(
        { ...ctx, itemId: response.id },
        'Successfully created inventory item',
      );

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to create inventory item');
      throw error;
    }
  }

  /**
   * Update an existing inventory item in QuickBooks Desktop
   */
  async updateInventoryItem(params: {
    endUserId: string;
    itemId: string;
    item: UpdateInventoryItemInput;
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'inventory.updateInventoryItem',
      endUserId: params.endUserId,
      itemId: params.itemId,
    };

    logger.info(ctx, 'Updating inventory item in QuickBooks Desktop...');

    try {
      const response = await this.conductor.qbd.inventoryItems.update(
        params.itemId,
        {
          conductorEndUserId: params.endUserId,
          ...params.item,
        },
      );

      logger.info(ctx, 'Successfully updated inventory item');

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to update inventory item');
      throw error;
    }
  }

  /**
   * Create an inventory adjustment to modify quantity on hand
   * @description In QuickBooks Desktop, quantity on hand cannot be updated directly.
   * Instead, you must create an inventory adjustment transaction.
   */
  async createInventoryAdjustment(params: {
    endUserId: string;
    adjustment: CreateInventoryAdjustmentInput;
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'inventory.createInventoryAdjustment',
      endUserId: params.endUserId,
    };

    logger.info(ctx, 'Creating inventory adjustment in QuickBooks Desktop...');

    try {
      const response = await this.conductor.qbd.inventoryAdjustments.create({
        conductorEndUserId: params.endUserId,
        ...params.adjustment,
      });

      logger.info(
        { ...ctx, adjustmentId: response.id },
        'Successfully created inventory adjustment',
      );

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to create inventory adjustment');
      throw error;
    }
  }

  /**
   * List accounts from QuickBooks Desktop
   * @description Used to find account IDs needed for inventory operations
   */
  async listAccounts(params: {
    endUserId: string;
    limit?: number;
    type?: string;
  }) {
    const logger = await getLogger();

    const ctx = {
      name: 'inventory.listAccounts',
      endUserId: params.endUserId,
    };

    logger.info(ctx, 'Fetching accounts from QuickBooks Desktop...');

    try {
      const response = await this.conductor.qbd.accounts.list({
        conductorEndUserId: params.endUserId,
        limit: params.limit || 100,
        type: params.type as any,
      });

      logger.info(
        { ...ctx, count: response.data?.length },
        'Successfully fetched accounts',
      );

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to fetch accounts');
      throw error;
    }
  }
}

/**
 * Factory function to create a new Inventory service instance
 * @returns InventoryService instance
 */
export function createInventoryService() {
  return new InventoryService();
}
