/**
 * Inventory Feature Index
 *
 * Registers all inventory-related API routes.
 * 
 * IMPORTANT: Route order matters! More specific routes MUST come before generic ones.
 * - /:id/history → before /:id
 * - /:id/adjust → before /:id
 * - /:id → before /
 */

import { Router, Response, Request, NextFunction } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../interfaces';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../utils';
import {
  getInventoryList,
  getInventoryById as getInventoryByIdService,
  updateInventory as updateInventoryService,
  adjustInventory as adjustInventoryService,
  getInventoryHistory as getInventoryHistoryService,
} from './services/inventory.service';
import backfillInventoryRouter from './apis/backfill-inventory';

// Phase 3: Multi-location APIs (TEMPORARILY DISABLED - circular dependency issue)
// import getProductLocations from './apis/get-product-locations';
// import createTransfer from './apis/create-transfer';
// import executeTransfer from './apis/execute-transfer';
// import listTransfers from './apis/list-transfers';

// ============================================
// SCHEMAS
// ============================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  condition: z.enum(['sellable', 'damaged', 'quarantined', 'expired']).optional(),
  status: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
  location: z.string().optional(),
});

const paramsSchema = z.object({
  id: uuidSchema,
});

const updateBodySchema = z.object({
  condition: z.enum(['sellable', 'damaged', 'quarantined', 'expired']).optional(),
  location: z.string().max(255).optional(),
  incoming_quantity: z.number().int().min(0).optional(),
  incoming_po_reference: z.string().max(100).optional(),
  incoming_eta: z.string().datetime().optional(),
});

const adjustBodySchema = z.object({
  quantity_change: z.number().int().refine(val => val !== 0, {
    message: 'Quantity change cannot be zero',
  }),
  reason: z.string().min(1).max(500),
  reference_number: z.string().max(100).optional(),
  notes: z.string().optional(),
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ============================================
// ROUTE CLASS
// ============================================

class InventoryRoute {
  public path = '/inventory';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // ORDER MATTERS: Most specific routes first!

    // POST /api/inventory/backfill - Admin: Create inventory for products without one
    this.router.use(this.path, backfillInventoryRouter);

    // GET /api/inventory/:id/history
    this.router.get(`${this.path}/:id/history`, this.getInventoryHistory);

    // POST /api/inventory/:id/adjust
    this.router.post(`${this.path}/:id/adjust`, this.adjustInventory);

    // PUT /api/inventory/:id
    this.router.put(`${this.path}/:id`, this.updateInventory);

    // GET /api/inventory/:id
    this.router.get(`${this.path}/:id`, this.getInventoryById);

    // GET /api/inventory (LIST - must be LAST)
    this.router.get(this.path, this.getAllInventory);

    // Phase 3: Multi-location routes (TEMPORARILY DISABLED)
    // this.router.use(this.path, getProductLocations);
    // this.router.use(this.path, createTransfer);
    // this.router.use(this.path, executeTransfer);
    // this.router.use(this.path, listTransfers);
  }

  // ============================================
  // HANDLERS
  // ============================================

  private async getAllInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const params = querySchema.parse(req.query);
      logger.info('GET /api/inventory', { params });

      const result = await getInventoryList(params);

      ResponseFormatter.paginated(
        res,
        result.items,
        { page: result.page, limit: result.limit, total: result.total },
        'Inventory retrieved successfully'
      );
    } catch (error) {
      logger.error('Error in get-all-inventory:', error);
      next(error);
    }
  }

  private async getInventoryById(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // If no ID provided, skip to next route (list endpoint)
      if (!id) {
        return next('route');
      }

      // If ID is not a valid UUID, skip to next route
      const validation = paramsSchema.safeParse({ id });
      if (!validation.success) {
        return next('route');
      }

      logger.info(`GET /api/inventory/${id}`);

      const item = await getInventoryByIdService(id);
      if (!item) {
        throw new HttpException(404, 'Inventory item not found');
      }

      ResponseFormatter.success(res, item, 'Inventory item retrieved successfully');
    } catch (error) {
      logger.error('Error in get-inventory-by-id:', error);
      next(error);
    }
  }

  private async updateInventory(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const paramsValidation = paramsSchema.safeParse({ id });
      if (!paramsValidation.success) {
        throw new HttpException(400, 'Invalid inventory ID format');
      }

      const bodyValidation = updateBodySchema.safeParse(req.body);
      if (!bodyValidation.success) {
        throw new HttpException(400, bodyValidation.error.issues[0]?.message || 'Invalid request body');
      }

      const data = bodyValidation.data;
      const userId = req.userId || 'system';

      logger.info(`PUT /api/inventory/${id}`, { data });

      const existing = await getInventoryByIdService(id);
      if (!existing) {
        throw new HttpException(404, 'Inventory item not found');
      }

      const updated = await updateInventoryService(id, data, userId);
      ResponseFormatter.success(res, updated, 'Inventory updated successfully');
    } catch (error) {
      logger.error('Error in update-inventory:', error);
      next(error);
    }
  }

  private async adjustInventory(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const paramsValidation = paramsSchema.safeParse({ id });
      if (!paramsValidation.success) {
        throw new HttpException(400, 'Invalid inventory ID format');
      }

      const bodyValidation = adjustBodySchema.safeParse(req.body);
      if (!bodyValidation.success) {
        throw new HttpException(400, bodyValidation.error.issues[0]?.message || 'Invalid request body');
      }

      const data = bodyValidation.data;
      const userId = req.userId || 'system';

      logger.info(`POST /api/inventory/${id}/adjust`, { data });

      const existing = await getInventoryByIdService(id);
      if (!existing) {
        throw new HttpException(404, 'Inventory item not found');
      }

      const result = await adjustInventoryService(id, data, userId);

      ResponseFormatter.success(
        res,
        {
          inventory: result.inventory,
          adjustment: result.adjustment,
        },
        'Inventory adjusted successfully'
      );
    } catch (error: any) {
      logger.error('Error in adjust-inventory:', error);

      if (error.message === 'Resulting quantity cannot be negative') {
        return next(new HttpException(400, error.message));
      }

      next(error);
    }
  }

  private async getInventoryHistory(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const paramsValidation = paramsSchema.safeParse({ id });
      if (!paramsValidation.success) {
        throw new HttpException(400, 'Invalid inventory ID format');
      }

      const { limit } = historyQuerySchema.parse(req.query);

      logger.info(`GET /api/inventory/${id}/history`);

      const existing = await getInventoryByIdService(id);
      if (!existing) {
        throw new HttpException(404, 'Inventory item not found');
      }

      const history = await getInventoryHistoryService(id, limit);
      ResponseFormatter.success(res, history, 'Inventory history retrieved successfully');
    } catch (error) {
      logger.error('Error in get-inventory-history:', error);
      next(error);
    }
  }
}

export default InventoryRoute;

// Shared resources
export * from './shared';

// Services
export * from './services/inventory.service';
