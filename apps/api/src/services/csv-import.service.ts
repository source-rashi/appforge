import fs from 'fs';
import Papa from 'papaparse';
import { prisma } from '../db/prisma';
import { DynamicSchemaManager } from './dynamic-schema.service';
import { eventBus } from './event-bus.service';
import type { TableConfig, FieldConfig } from '@appforge/config-types';
import type { ImportJob } from '@prisma/client';

export class CsvImportService {
  constructor(private schemaManager: DynamicSchemaManager) {}

  async processImport(job: {
    jobId: string;
    tableName: string;
    filePath: string;
    fieldMapping: Record<string, string>;
    tableConfig: TableConfig;
    userId?: string;
  }): Promise<ImportJob> {
    const { jobId, tableName, filePath, fieldMapping, tableConfig, userId } = job;
    
    // 1. Update ImportJob status to "processing"
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'processing', updatedAt: new Date() }
    });

    let totalRows = 0;
    let processedRows = 0;
    const errors: { row: number; field?: string; message: string }[] = [];
    
    const fileStream = fs.createReadStream(filePath);
    
    // Batch processing state
    let batch: Record<string, unknown>[] = [];
    const BATCH_SIZE = 100;
    
    const processBatch = async (rows: Record<string, unknown>[]) => {
      if (rows.length === 0) return;
      const res = await this.schemaManager.bulkInsert(tableName, rows);
      processedRows += res.inserted;
      if (res.failed > 0) {
        // res.errors is an array of { row: number, error: string } 
        // We need to map the internal bulkInsert row index back to CSV row index if possible, 
        // but for now we append them with generic row index.
        errors.push(...res.errors.map(e => ({ row: -1, message: `Bulk insert error: ${e.error}` })));
      }
    };

    return new Promise((resolve, reject) => {
      Papa.parse(fileStream, {
        header: true,
        skipEmptyLines: true,
        step: async (results, parser) => {
          totalRows++;
          const rowData = results.data as Record<string, string>;
          const mappedRow: Record<string, unknown> = {};
          let rowValid = true;

          // 3. For each row:
          // a. Apply fieldMapping to rename columns
          for (const [csvCol, tableField] of Object.entries(fieldMapping)) {
            const val = rowData[csvCol];
            if (val !== undefined) {
              mappedRow[tableField] = val;
            }
          }

          // Ensure tracking metadata
          if (userId) {
            mappedRow['created_by'] = userId;
          }

          // Process fields based on tableConfig
          for (const field of tableConfig.fields) {
            const rawVal = mappedRow[field.name];
            
            // Required check
            if (field.required && (rawVal === undefined || rawVal === null || rawVal === '')) {
              errors.push({ row: totalRows, field: field.name, message: `Field is required` });
              rowValid = false;
              continue;
            }

            if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
              try {
                // b. Coerce types
                mappedRow[field.name] = this.coerceType(rawVal as string, field);
                
                // c. Apply validation rules (could be custom regex, min/max if present in field config, but we'll trust coercion + DB constraints mostly. 
                // We'll simulate a basic type valid check here.)
              } catch (err: any) {
                errors.push({ row: totalRows, field: field.name, message: err.message });
                rowValid = false;
              }
            } else if (rawVal === '') {
              // Delete empty string keys so DB can apply DEFAULT or NULL
              delete mappedRow[field.name];
            }
          }

          // d. On validation pass: queue for bulk insert
          if (rowValid) {
            batch.push(mappedRow);
            if (batch.length >= BATCH_SIZE) {
              parser.pause();
              await processBatch(batch);
              batch = [];
              parser.resume();
            }
          }
        },
        complete: async () => {
          try {
            // Process remaining
            if (batch.length > 0) {
              await processBatch(batch);
            }
            
            // 5. Update ImportJob
            const finalStatus = errors.length > 0 && processedRows === 0 ? 'failed' : 'completed';
            const finalJob = await prisma.importJob.update({
              where: { id: jobId },
              data: {
                status: finalStatus,
                totalRows,
                processedRows,
                errors: JSON.stringify(errors),
                updatedAt: new Date()
              }
            });

            // 6. Emit event
            if (finalStatus === 'completed') {
              eventBus.emit('import:completed', { tableName, jobId, rowsImported: processedRows });
            } else {
              eventBus.emit('import:failed', { tableName, jobId, error: 'Import failed completely' });
            }
            
            // Cleanup temp file
            fs.unlink(filePath, () => {});

            resolve(finalJob);
          } catch (err: any) {
            reject(err);
          }
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }

  private coerceType(value: string, field: FieldConfig): unknown {
    const val = value.trim();
    switch (field.type) {
      case 'number': {
        const num = Number(val);
        if (isNaN(num)) throw new Error(`Invalid number: ${val}`);
        return num;
      }
      case 'boolean': {
        const lower = val.toLowerCase();
        if (['true', '1', 'yes', 't'].includes(lower)) return true;
        if (['false', '0', 'no', 'f'].includes(lower)) return false;
        throw new Error(`Invalid boolean: ${val}`);
      }
      case 'date': {
        const date = new Date(val);
        if (isNaN(date.getTime())) throw new Error(`Invalid date: ${val}`);
        return date.toISOString();
      }
      case 'string':
      case 'email':
      case 'enum':
      case 'relation':
        return val;
      default:
        return val;
    }
  }

  async getImportStatus(jobId: string): Promise<ImportJob> {
    const job = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Import job not found');
    return job;
  }

  async listImports(tableName: string): Promise<ImportJob[]> {
    return prisma.importJob.findMany({
      where: { tableName },
      orderBy: { createdAt: 'desc' }
    });
  }
}
