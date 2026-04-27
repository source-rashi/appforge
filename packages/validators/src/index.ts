/**
 * @appforge/validators
 *
 * Shared config validation logic for AppForge.
 * Built on Zod — schemas mirror the AppConfig interface from @appforge/config-types.
 */

import { z } from "zod";
import type { AppConfig, ComponentConfig } from "@appforge/config-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Coerce "true"/"false" strings to boolean
const booleanSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toLowerCase() === "true" : val),
  z.boolean().default(false)
);

// ─── Validation Rule ──────────────────────────────────────────────────────────

const validationRuleSchema = z.object({
  type: z.enum(["min", "max", "minLength", "maxLength", "pattern", "custom"]),
  value: z.unknown(),
  message: z.string(),
});

// ─── Fields ───────────────────────────────────────────────────────────────────

const fieldConfigSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "date", "email", "enum", "relation"]),
  required: booleanSchema.optional(),
  defaultValue: z.unknown().optional(),
  options: z.array(z.string()).optional(),
  relatedTable: z.string().optional(),
  validation: z.array(validationRuleSchema).optional(),
}).strip();

// ─── Database ─────────────────────────────────────────────────────────────────

const tableConfigSchema = z.object({
  name: z.string().min(1),
  fields: z.array(fieldConfigSchema).default([]),
  timestamps: booleanSchema.optional(),
}).strip();

const databaseConfigSchema = z.object({
  tables: z.array(tableConfigSchema).default([]),
}).strip();

// ─── Auth ─────────────────────────────────────────────────────────────────────

const authConfigSchema = z.object({
  enabled: booleanSchema,
  provider: z.enum(["email", "oauth_google"]).default("email"),
  fields: z.array(fieldConfigSchema).optional(),
}).strip();

// ─── Components ───────────────────────────────────────────────────────────────

const widgetConfigSchema = z.object({
  type: z.enum(["count", "chart_bar", "chart_line", "stat"]),
  table: z.string(),
  field: z.string().optional(),
  label: z.string(),
  filter: z.record(z.unknown()).optional(),
}).strip();

const formComponentSchema = z.object({
  type: z.literal("form"),
  table: z.string(),
  fields: z.array(z.string()).optional(),
  submitLabel: z.string().optional(),
  onSuccess: z.enum(["redirect", "reset"]).optional(),
  redirectTo: z.string().optional(),
}).strip();

const tableComponentSchema = z.object({
  type: z.literal("table"),
  table: z.string(),
  columns: z.array(z.string()).optional(),
  searchable: booleanSchema.optional(),
  sortable: booleanSchema.optional(),
  paginated: booleanSchema.optional(),
  pageSize: z.number().int().positive().optional(),
}).strip();

const dashboardComponentSchema = z.object({
  type: z.literal("dashboard"),
  widgets: z.array(widgetConfigSchema).default([]),
}).strip();

const csvImportComponentSchema = z.object({
  type: z.literal("csv_import"),
  table: z.string(),
  fieldMapping: z.record(z.string()).optional(),
}).strip();

const unknownComponentSchema = z.object({
  type: z.literal("unknown"),
  raw: z.unknown(),
}).strip();

const componentConfigSchema = z.preprocess(
  (val: any) => {
    if (!val || typeof val !== "object" || !val.type) {
      return { type: "unknown", raw: val };
    }
    if (["form", "table", "dashboard", "csv_import"].includes(val.type)) {
      return val;
    }
    return { type: "unknown", raw: val };
  },
  z.discriminatedUnion("type", [
    formComponentSchema,
    tableComponentSchema,
    dashboardComponentSchema,
    csvImportComponentSchema,
    unknownComponentSchema,
  ])
);

// ─── Pages ────────────────────────────────────────────────────────────────────

const pageConfigSchema = z.object({
  id: z.string().min(1),
  path: z.string(),
  title: z.string(),
  auth: booleanSchema.optional(),
  components: z.array(componentConfigSchema).default([]),
}).strip();

// ─── API ──────────────────────────────────────────────────────────────────────

const apiConfigSchema = z.object({
  path: z.string(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
  table: z.string(),
  action: z.enum(["list", "create", "read", "update", "delete", "custom"]),
  auth: booleanSchema.optional(),
  validation: z.record(z.array(validationRuleSchema)).optional(),
}).strip();

// ─── Notifications ────────────────────────────────────────────────────────────

const notificationEventSchema = z.object({
  trigger: z.enum(["on_create", "on_update", "on_delete", "custom"]),
  table: z.string().optional(),
  channel: z.enum(["email", "in_app"]),
  template: z.string(),
  recipients: z.union([
    z.literal("creator"),
    z.literal("all"),
    z.array(z.string())
  ]),
}).strip();

const notificationConfigSchema = z.object({
  events: z.array(notificationEventSchema).default([]),
}).strip();

// ─── I18n ─────────────────────────────────────────────────────────────────────

const i18nConfigSchema = z.object({
  defaultLocale: z.string().default("en"),
  locales: z.array(z.string()).default(["en"]),
  translations: z.record(z.record(z.string())).optional(),
}).strip();

// ─── Root AppConfig schema ────────────────────────────────────────────────────

export const appConfigSchema = z.object({
  id: z.string().min(1).default("default-app"),
  name: z.string().min(1).default("Default App"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0"),
  
  auth: authConfigSchema.optional(),
  database: databaseConfigSchema.default({ tables: [] }),
  pages: z.array(pageConfigSchema).default([]),
  api: z.array(apiConfigSchema).default([]),
  notifications: notificationConfigSchema.optional(),
  i18n: i18nConfigSchema.optional(),
}).strip();

// ─── Validation result types ──────────────────────────────────────────────────

export interface ValidationSuccess {
  valid: true;
  config: AppConfig;
}

export interface ValidationFailure {
  valid: false;
  errors: string[];
  partialConfig: Partial<AppConfig>;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ─── Default Config ───────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: AppConfig = {
  id: "default-app",
  name: "Default App",
  version: "1.0.0",
  database: {
    tables: [
      {
        name: "items",
        fields: [
          { name: "id", type: "string", required: true },
          { name: "name", type: "string", required: true },
          { name: "createdAt", type: "date", required: true },
        ],
        timestamps: true,
      },
    ],
  },
  pages: [],
  api: [],
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates an unknown object against the AppConfig schema with graceful degradation.
 *
 * @param raw - The raw JSON object
 * @returns A discriminated union: { valid: true, config } | { valid: false, errors, partialConfig }
 */
export function validateConfig(raw: unknown): ValidationResult {
  const parsed = appConfigSchema.safeParse(raw);

  if (parsed.success) {
    return { valid: true, config: parsed.data as AppConfig };
  }

  // Graceful degradation: parse fields individually to construct a partial config
  const errors = parsed.error.errors.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  
  let partialConfig: Partial<AppConfig> = {};
  if (typeof raw === "object" && raw !== null) {
    const rawObj = raw as Record<string, unknown>;
    partialConfig = {
      id: typeof rawObj.id === "string" ? rawObj.id : "default-app",
      name: typeof rawObj.name === "string" ? rawObj.name : "Default App",
      version: typeof rawObj.version === "string" && /^\d+\.\d+\.\d+$/.test(rawObj.version) ? rawObj.version : "1.0.0",
    };
    
    // Safely attempt to parse complex structures if they exist
    if ("database" in rawObj) {
      const dbParse = databaseConfigSchema.safeParse(rawObj.database);
      if (dbParse.success) partialConfig.database = dbParse.data as any;
    }
    
    if ("pages" in rawObj) {
      const pagesParse = z.array(pageConfigSchema).safeParse(rawObj.pages);
      if (pagesParse.success) partialConfig.pages = pagesParse.data as any;
    }
    
    if ("api" in rawObj) {
      const apiParse = z.array(apiConfigSchema).safeParse(rawObj.api);
      if (apiParse.success) partialConfig.api = apiParse.data as any;
    }
    
    if ("auth" in rawObj) {
      const authParse = authConfigSchema.safeParse(rawObj.auth);
      if (authParse.success) partialConfig.auth = authParse.data as any;
    }
    
    if ("notifications" in rawObj) {
      const notifParse = notificationConfigSchema.safeParse(rawObj.notifications);
      if (notifParse.success) partialConfig.notifications = notifParse.data as any;
    }
    
    if ("i18n" in rawObj) {
      const i18nParse = i18nConfigSchema.safeParse(rawObj.i18n);
      if (i18nParse.success) partialConfig.i18n = i18nParse.data as any;
    }
  }

  // Provide sensible defaults for missing required base fields
  if (!partialConfig.database) {
     partialConfig.database = DEFAULT_CONFIG.database;
  }
  if (!partialConfig.pages) {
     partialConfig.pages = [];
  }
  if (!partialConfig.api) {
     partialConfig.api = [];
  }

  return { valid: false, errors, partialConfig };
}

export { appConfigSchema as ConfigSchema };
