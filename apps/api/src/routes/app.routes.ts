import { Router, Request, Response, NextFunction } from 'express';
import { validateConfig } from '@appforge/validators';
import type { AppConfig } from '@appforge/config-types';
import { DynamicSchemaManager } from '../services/dynamic-schema.service';
import { DynamicApiEngine } from '../services/dynamic-api.service';
import { AppError } from '../utils/errors';
import { dynamicRouter } from '../index'; // import the dynamicRouter from index
// import app from '../index'; // removed app import to avoid confusion

const router = Router();

// In-memory store for configs
export const configsMap = new Map<string, AppConfig>();

// Services instances (can be dependency injected ideally, but we instantiate here for simplicity)
const schemaManager = new DynamicSchemaManager();
const dynamicApiEngine = new DynamicApiEngine(schemaManager);

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.get('/', asyncHandler(async (req, res) => {
  const apps = Array.from(configsMap.values()).map(config => ({
    id: config.id,
    name: config.name,
  }));
  res.status(200).json({ data: apps });
}));

router.post('/', asyncHandler(async (req, res) => {
  const rawConfig = req.body.config;
  if (!rawConfig) {
    throw new AppError('Config is required', 400, 'MISSING_CONFIG');
  }

  const validationResult = validateConfig(rawConfig);
  const config = validationResult.valid ? validationResult.config : (validationResult.partialConfig as AppConfig);
  const warnings = validationResult.valid ? [] : validationResult.errors;

  const appId = config.id;

  // 2. Sync tables
  const syncResult = await schemaManager.syncTables(config.database, appId);

  // 3. Mount routes
  dynamicApiEngine.mountRoutes(dynamicRouter as any, config.api, appId);

  // 4. Store config
  configsMap.set(appId, config);

  res.status(201).json({
    appId,
    warnings,
    syncResult,
  });
}));

router.get('/:appId/config', asyncHandler(async (req, res) => {
  const appId = req.params.appId;
  const config = configsMap.get(appId);

  if (!config) {
    throw new AppError(`Config for app ${appId} not found`, 404, 'NOT_FOUND');
  }

  res.status(200).json({ config });
}));

router.put('/:appId/config', asyncHandler(async (req, res) => {
  const appId = req.params.appId;
  const rawConfig = req.body.config;

  if (!rawConfig) {
    throw new AppError('Config is required', 400, 'MISSING_CONFIG');
  }

  const validationResult = validateConfig(rawConfig);
  const config = validationResult.valid ? validationResult.config : (validationResult.partialConfig as AppConfig);
  const warnings = validationResult.valid ? [] : validationResult.errors;

  // Ensure ID cannot be changed via payload mismatch
  if (config.id !== appId) {
    config.id = appId;
  }

  const syncResult = await schemaManager.syncTables(config.database, appId);
  dynamicApiEngine.mountRoutes(dynamicRouter as any, config.api, appId);
  configsMap.set(appId, config);

  res.status(200).json({
    appId,
    warnings,
    syncResult,
  });
}));

export default router;
