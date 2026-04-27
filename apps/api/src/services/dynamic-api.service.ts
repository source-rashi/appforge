import { Express, Request, Response, NextFunction, RequestHandler, Router } from 'express';
import type { ApiConfig, ValidationRule } from '@appforge/config-types';
import { DynamicSchemaManager } from './dynamic-schema.service';
import { eventBus } from './event-bus.service';
import { AppError } from '../utils/errors';
import { requireAuth } from '../middleware/auth.middleware';

// Wrap async handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export class DynamicApiEngine {
  // Store routers per app to allow re-mounting without restarting server
  private appRouters = new Map<string, Router>();

  constructor(private schemaManager: DynamicSchemaManager) {}

  mountRoutes(app: Express, apiConfigs: ApiConfig[], appId: string): void {
    // Replace old router for this appId if it exists
    const existingRouter = this.appRouters.get(appId);
    if (existingRouter) {
      // In Express, we can't easily "unmount" a router cleanly without re-ordering,
      // but we can clear its stack.
      existingRouter.stack.length = 0;
    } else {
      const newRouter = Router();
      this.appRouters.set(appId, newRouter);
      app.use(`/api/apps/${appId}`, newRouter);
    }

    const router = this.appRouters.get(appId)!;

    for (const config of apiConfigs) {
      try {
        const middlewares: RequestHandler[] = [];

        if (config.auth) {
          middlewares.push(requireAuth);
        }

        if (config.validation) {
          middlewares.push(this.createValidationMiddleware(config.validation));
        }

        const method = config.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
        
        switch (config.action) {
          case 'list':
            router[method](config.path, ...middlewares, asyncHandler((req, res) => this.handleList(config.table, req, res)));
            break;
          case 'create':
            router[method](config.path, ...middlewares, asyncHandler((req, res) => this.handleCreate(config.table, req, res)));
            break;
          case 'read':
            router[method](config.path, ...middlewares, asyncHandler((req, res) => this.handleRead(config.table, req, res)));
            break;
          case 'update':
            router[method](config.path, ...middlewares, asyncHandler((req, res) => this.handleUpdate(config.table, req, res)));
            break;
          case 'delete':
            router[method](config.path, ...middlewares, asyncHandler((req, res) => this.handleDelete(config.table, req, res)));
            break;
          case 'custom':
            router[method](config.path, ...middlewares, asyncHandler((req, res) => this.handleCustom(config.table, req, res)));
            break;
          default:
            console.warn(`[DynamicApiEngine] Unknown action '${config.action}' for route ${config.path}`);
        }
      } catch (err: any) {
        console.error(`[DynamicApiEngine] Failed to mount route ${config.method} ${config.path}: ${err.message}`);
      }
    }
  }

  private async handleList(tableName: string, req: Request, res: Response): Promise<void> {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? Math.min(parseInt(req.query.pageSize as string, 10), 100) : 20;
    const search = req.query.search as string | undefined;
    const searchFields = req.query.searchFields ? (req.query.searchFields as string).split(',') : undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Extract filters (any query param that is not pagination/search/sort)
    const filter: Record<string, unknown> = {};
    const reservedKeys = ['page', 'pageSize', 'search', 'searchFields', 'sortBy', 'sortOrder'];
    for (const [key, value] of Object.entries(req.query)) {
      if (!reservedKeys.includes(key)) {
        filter[key] = value;
      }
    }

    const result = await this.schemaManager.findRows(tableName, {
      page,
      pageSize,
      search,
      searchFields,
      sortBy,
      sortOrder,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    res.status(200).json({
      data: result.rows,
      meta: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  }

  private async handleCreate(tableName: string, req: Request, res: Response): Promise<void> {
    const data = { ...req.body };
    if (req.user?.id) {
      data.created_by = req.user.id;
    }

    const row = await this.schemaManager.insertRow(tableName, data);
    
    eventBus.emit('row:created', { tableName, row, userId: req.user?.id });

    res.status(201).json({ data: row });
  }

  private async handleRead(tableName: string, req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    if (!id) throw new AppError('ID parameter is required', 400, 'MISSING_PARAM');

    const row = await this.schemaManager.findRowById(tableName, id);
    if (!row) {
      throw new AppError(`Row not found in table ${tableName}`, 404, 'NOT_FOUND');
    }

    res.status(200).json({ data: row });
  }

  private async handleUpdate(tableName: string, req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    if (!id) throw new AppError('ID parameter is required', 400, 'MISSING_PARAM');

    const existingRow = await this.schemaManager.findRowById(tableName, id);
    if (!existingRow) {
      throw new AppError(`Row not found in table ${tableName}`, 404, 'NOT_FOUND');
    }

    // User scoping
    if (existingRow.created_by && existingRow.created_by !== req.user?.id) {
      throw new AppError('Forbidden to update this row', 403, 'FORBIDDEN');
    }

    const updatedRow = await this.schemaManager.updateRow(tableName, id, req.body);
    
    eventBus.emit('row:updated', { tableName, row: updatedRow, userId: req.user?.id });

    res.status(200).json({ data: updatedRow });
  }

  private async handleDelete(tableName: string, req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    if (!id) throw new AppError('ID parameter is required', 400, 'MISSING_PARAM');

    const existingRow = await this.schemaManager.findRowById(tableName, id);
    if (!existingRow) {
      throw new AppError(`Row not found in table ${tableName}`, 404, 'NOT_FOUND');
    }

    // User scoping
    if (existingRow.created_by && existingRow.created_by !== req.user?.id) {
      throw new AppError('Forbidden to delete this row', 403, 'FORBIDDEN');
    }

    await this.schemaManager.deleteRow(tableName, id);

    eventBus.emit('row:deleted', { tableName, id, userId: req.user?.id });

    res.status(204).send();
  }

  private async handleCustom(tableName: string, req: Request, res: Response): Promise<void> {
    throw new AppError('Custom actions are not yet implemented', 501, 'NOT_IMPLEMENTED');
  }

  private createValidationMiddleware(rules: Record<string, ValidationRule[]>): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const errors: Record<string, string[]> = {};

      for (const [field, fieldRules] of Object.entries(rules)) {
        const val = req.body[field];
        
        for (const rule of fieldRules) {
          let isValid = true;
          switch (rule.type) {
            case 'min':
              isValid = typeof val === 'number' && val >= (rule.value as number);
              break;
            case 'max':
              isValid = typeof val === 'number' && val <= (rule.value as number);
              break;
            case 'minLength':
              isValid = typeof val === 'string' && val.length >= (rule.value as number);
              break;
            case 'maxLength':
              isValid = typeof val === 'string' && val.length <= (rule.value as number);
              break;
            case 'pattern':
              isValid = typeof val === 'string' && new RegExp(rule.value as string).test(val);
              break;
            case 'custom':
              // Skip custom logic as it requires code execution
              break;
          }

          if (!isValid && val !== undefined) {
            if (!errors[field]) errors[field] = [];
            errors[field].push(rule.message);
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', fields: errors });
      }

      next();
    };
  }
}
