import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { requireAuth } from '../middleware/auth.middleware';
import { AppError } from '../utils/errors';
import { configsMap } from './app.routes';
import { prisma } from '../db/prisma';
import { DynamicSchemaManager } from '../services/dynamic-schema.service';
import { CsvImportService } from '../services/csv-import.service';

const router = Router();

// Configure multer
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new AppError('Only CSV files are allowed', 400, 'INVALID_FILE_TYPE'));
    }
  }
});

const schemaManager = new DynamicSchemaManager();
const csvImportService = new CsvImportService(schemaManager);

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.post('/:appId/import/:tableName', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const { appId, tableName } = req.params;
  const file = req.file;
  let fieldMapping: Record<string, string> = {};

  if (!file) {
    throw new AppError('CSV file is required', 400, 'MISSING_FILE');
  }

  if (req.body.fieldMapping) {
    try {
      fieldMapping = JSON.parse(req.body.fieldMapping);
    } catch {
      throw new AppError('fieldMapping must be valid JSON', 400, 'INVALID_JSON');
    }
  }

  // 1. Validate the table exists
  const appConfig = configsMap.get(appId);
  if (!appConfig) {
    throw new AppError('App config not found', 404, 'NOT_FOUND');
  }

  const tableConfig = appConfig.database.tables.find(t => t.name === tableName);
  if (!tableConfig) {
    throw new AppError(`Table ${tableName} not found in app config`, 404, 'NOT_FOUND');
  }

  // Fallback field mapping (1:1 mapping if not provided)
  if (Object.keys(fieldMapping).length === 0) {
    for (const field of tableConfig.fields) {
      fieldMapping[field.name] = field.name;
    }
  }

  // 3. Create ImportJob
  const job = await prisma.importJob.create({
    data: {
      tableName,
      fileName: file.originalname,
      status: 'pending'
    }
  });

  // 4. Start ASYNCHRONOUSLY
  csvImportService.processImport({
    jobId: job.id,
    tableName,
    filePath: file.path,
    fieldMapping,
    tableConfig,
    userId: req.user?.id
  }).catch(err => {
    console.error(`[CsvImportService] Job ${job.id} failed:`, err);
  });

  // 5. Return 202
  res.status(202).json({ jobId: job.id, message: 'Import started' });
}));

router.get('/:appId/import/:jobId/status', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await csvImportService.getImportStatus(jobId);
  
  res.status(200).json({ job });
}));

router.get('/:appId/import/:tableName/history', asyncHandler(async (req, res) => {
  const { tableName } = req.params;
  const imports = await csvImportService.listImports(tableName);
  
  res.status(200).json({ imports });
}));

router.get('/:appId/import/:tableName/template', asyncHandler(async (req, res) => {
  const { appId, tableName } = req.params;
  
  const appConfig = configsMap.get(appId);
  if (!appConfig) {
    throw new AppError('App config not found', 404, 'NOT_FOUND');
  }

  const tableConfig = appConfig.database.tables.find(t => t.name === tableName);
  if (!tableConfig) {
    throw new AppError(`Table ${tableName} not found in app config`, 404, 'NOT_FOUND');
  }

  const headers = tableConfig.fields.map(f => f.name).join(',');
  const exampleRow = tableConfig.fields.map(f => {
    switch(f.type) {
      case 'string': return '"example string"';
      case 'number': return '42';
      case 'boolean': return 'true';
      case 'date': return new Date().toISOString().split('T')[0];
      case 'email': return 'user@example.com';
      case 'enum': return f.options ? f.options[0] : 'opt1';
      case 'relation': return 'uuid-reference-here';
      default: return '""';
    }
  }).join(',');

  const csv = `${headers}\n${exampleRow}\n`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${tableName}_template.csv"`);
  res.status(200).send(csv);
}));

export default router;
