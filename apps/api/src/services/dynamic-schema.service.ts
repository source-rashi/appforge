import { Pool } from 'pg';
import type { DatabaseConfig, FieldConfig } from '@appforge/config-types';

export type SyncResult = {
  created: string[];
  altered: string[];
  errors: { table: string; error: string }[];
};

export type QueryOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  searchFields?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
};

export type BulkInsertResult = {
  inserted: number;
  failed: number;
  errors: { row: number; error: string }[];
};

export class DynamicSchemaManager {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  /**
   * Helper to ensure table names are prefixed with 'af_'
   */
  private getTableName(name: string): string {
    return name.startsWith('af_') ? name : `af_${name}`;
  }

  /**
   * Maps FieldConfig.type to PostgreSQL types
   */
  private mapColumnType(field: FieldConfig): string {
    switch (field.type) {
      case 'string':
        return 'TEXT';
      case 'number':
        return 'NUMERIC';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'TIMESTAMPTZ';
      case 'email':
        return 'TEXT CHECK (position(\'@\' in "'+field.name+'") > 0)';
      case 'enum': {
        const options = field.options?.map((opt) => `'${opt}'`).join(', ') || "''";
        return `TEXT CHECK ("${field.name}" IN (${options}))`;
      }
      case 'relation':
        if (!field.relatedTable) {
          throw new Error('Relation type requires a relatedTable');
        }
        return `UUID REFERENCES "${this.getTableName(field.relatedTable)}"(id) ON DELETE SET NULL`;
      default:
        return 'TEXT';
    }
  }

  /**
   * Syncs the configuration tables with the PostgreSQL schema.
   */
  async syncTables(dbConfig: DatabaseConfig, configId: string): Promise<SyncResult> {
    const result: SyncResult = { created: [], altered: [], errors: [] };

    for (const tableConfig of dbConfig.tables) {
      const tableName = this.getTableName(tableConfig.name);

      try {
        // Check if table exists
        const checkTableRes = await this.pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [tableName]
        );

        const tableExists = checkTableRes.rows[0].exists;

        if (!tableExists) {
          // Create table
          const columns = tableConfig.fields.map((field) => {
            const isNullable = !field.required ? '' : ' NOT NULL';
            let def = '';
            if (field.defaultValue !== undefined) {
               def = ` DEFAULT '${field.defaultValue}'`; // A basic generic default, might need cast depending on type
               if (field.type === 'number') def = ` DEFAULT ${field.defaultValue}`;
               if (field.type === 'boolean') def = ` DEFAULT ${field.defaultValue ? 'TRUE' : 'FALSE'}`;
            }
            return `"${field.name}" ${this.mapColumnType(field)}${isNullable}${def}`;
          });

          // Always add fixed system columns
          columns.unshift(
            'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
            'updated_at TIMESTAMPTZ DEFAULT NOW()',
            'created_by UUID' // Nullable for system tasks or public created
          );

          await this.pool.query(`CREATE TABLE "${tableName}" (\n  ${columns.join(',\n  ')}\n);`);
          result.created.push(tableName);
        } else {
          // Alter table - add missing columns
          const existingColsRes = await this.pool.query(
            `SELECT column_name 
             FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = $1`,
            [tableName]
          );

          const existingCols = existingColsRes.rows.map((row) => row.column_name);
          let altered = false;

          for (const field of tableConfig.fields) {
            if (!existingCols.includes(field.name)) {
              // Add column
              const isNullable = !field.required ? '' : ' NOT NULL';
              let def = '';
              // Provide default to existing rows if it's NOT NULL
              if (field.required) {
                  // A crude workaround for NOT NULL on ALTER TABLE
                  if (field.type === 'number') def = ` DEFAULT 0`;
                  else if (field.type === 'boolean') def = ` DEFAULT FALSE`;
                  else def = ` DEFAULT ''`; 
              }
              if (field.defaultValue !== undefined) {
                 if (field.type === 'number') def = ` DEFAULT ${field.defaultValue}`;
                 else if (field.type === 'boolean') def = ` DEFAULT ${field.defaultValue ? 'TRUE' : 'FALSE'}`;
                 else def = ` DEFAULT '${field.defaultValue}'`;
              }
              
              await this.pool.query(
                `ALTER TABLE "${tableName}" ADD COLUMN "${field.name}" ${this.mapColumnType(field)}${isNullable}${def};`
              );
              altered = true;
            }
          }

          if (altered) {
            result.altered.push(tableName);
          }
        }

        // Save schema state in Prisma GeneratedTable using raw query (or Prisma client if preferred, but we'll use raw here)
        await this.pool.query(
          `INSERT INTO "GeneratedTable" (id, "configId", "tableName", "schemaJson", "updatedAt") 
           VALUES (gen_random_uuid(), $1, $2, $3, NOW())
           ON CONFLICT ("tableName") DO UPDATE SET "schemaJson" = EXCLUDED."schemaJson", "updatedAt" = NOW()`,
          [configId, tableName, JSON.stringify(tableConfig)]
        );

      } catch (err: any) {
        result.errors.push({ table: tableName, error: err.message });
      }
    }

    return result;
  }

  /**
   * Drops a dynamic table with safety checks
   */
  async dropTable(tableName: string): Promise<void> {
    const table = this.getTableName(tableName);
    if (!table.startsWith('af_')) {
      throw new Error(`Cannot drop table ${table}: security violation.`);
    }
    await this.pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
  }

  /**
   * Insert a single row
   */
  async insertRow(tableName: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const table = this.getTableName(tableName);
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (keys.length === 0) {
      const res = await this.pool.query(`INSERT INTO "${table}" DEFAULT VALUES RETURNING *`);
      return res.rows[0];
    }

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');

    const res = await this.pool.query(
      `INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return res.rows[0];
  }

  /**
   * Update a single row by ID
   */
  async updateRow(tableName: string, id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const table = this.getTableName(tableName);
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return (await this.pool.query(`SELECT * FROM "${table}" WHERE id = $1`, [id])).rows[0];
    }

    const setClauses = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(data)];

    const res = await this.pool.query(
      `UPDATE "${table}" SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values
    );
    return res.rows[0];
  }

  /**
   * Delete a single row by ID
   */
  async deleteRow(tableName: string, id: string): Promise<void> {
    const table = this.getTableName(tableName);
    await this.pool.query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
  }

  /**
   * Fetch rows with pagination, filtering, sorting, and searching
   */
  async findRows(tableName: string, options: QueryOptions): Promise<{ rows: Record<string, unknown>[], total: number }> {
    const table = this.getTableName(tableName);
    let query = `SELECT * FROM "${table}" WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM "${table}" WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        query += ` AND "${key}" = $${paramIndex}`;
        countQuery += ` AND "${key}" = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    if (options.search && options.searchFields && options.searchFields.length > 0) {
      const searchClauses = options.searchFields.map(f => `"${f}"::text ILIKE $${paramIndex}`).join(' OR ');
      query += ` AND (${searchClauses})`;
      countQuery += ` AND (${searchClauses})`;
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    if (options.sortBy) {
      const order = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY "${options.sortBy}" ${order}`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    if (options.pageSize) {
      const page = options.page || 1;
      const offset = (page - 1) * options.pageSize;
      query += ` LIMIT ${options.pageSize} OFFSET ${offset}`;
    }

    const [rowsRes, countRes] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query(countQuery, params)
    ]);

    return {
      rows: rowsRes.rows,
      total: parseInt(countRes.rows[0].count, 10),
    };
  }

  /**
   * Fetch a single row by ID
   */
  async findRowById(tableName: string, id: string): Promise<Record<string, unknown> | null> {
    const table = this.getTableName(tableName);
    const res = await this.pool.query(`SELECT * FROM "${table}" WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  /**
   * Insert multiple rows in batches
   */
  async bulkInsert(tableName: string, rows: Record<string, unknown>[]): Promise<BulkInsertResult> {
    const table = this.getTableName(tableName);
    const result: BulkInsertResult = { inserted: 0, failed: 0, errors: [] };
    const batchSize = 100;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      // Since individual rows can fail and we want to continue, the easiest
      // approach without complex DO NOTHING SQL for dynamic constraints is to do single inserts in parallel within the batch
      // Alternatively, we could do a large transaction, but the prompt says: "On individual row failure, record the error and continue (don't abort the entire import)."
      // So doing it via individual inserts within the batch loop or using a PL/pgSQL block. Individual promises are simpler.
      
      const promises = batch.map(async (row, idx) => {
        const rowIndex = i + idx;
        try {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map((_, j) => `$${j + 1}`).join(', ');
          const columns = keys.map(k => `"${k}"`).join(', ');

          if (keys.length > 0) {
            await this.pool.query(
              `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`,
              values
            );
          } else {
            await this.pool.query(`INSERT INTO "${table}" DEFAULT VALUES`);
          }
          result.inserted++;
        } catch (err: any) {
          result.failed++;
          result.errors.push({ row: rowIndex, error: err.message });
        }
      });

      await Promise.all(promises);
    }

    return result;
  }
}
