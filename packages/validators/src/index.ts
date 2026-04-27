/**
 * @appforge/validators
 *
 * Shared config validation logic for AppForge.
 * Built on Zod — schemas mirror the AppConfig interface from @appforge/config-types.
 */

import { z } from "zod";
import type { AppConfig } from "@appforge/config-types";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const featureFlagSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
  description: z.string().optional(),
});

const databaseConfigSchema = z.object({
  driver: z.enum(["postgres", "mysql", "sqlite", "mongodb"]),
  url: z.string().min(1, "database.url is required"),
  poolSize: z.number().int().positive().optional(),
  ssl: z.boolean().optional(),
});

const authConfigSchema = z.object({
  strategy: z.enum(["jwt", "session", "oauth2"]),
  tokenExpiry: z.string().optional(),
  providers: z
    .array(z.enum(["google", "github", "discord"]))
    .optional(),
});

const apiConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  corsOrigins: z.array(z.string().url()),
  rateLimit: z
    .object({
      windowMs: z.number().int().positive(),
      max: z.number().int().positive(),
    })
    .optional(),
});

const uiConfigSchema = z.object({
  appName: z.string().min(1, "ui.appName is required"),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Must be a valid hex color")
    .optional(),
  defaultColorScheme: z.enum(["light", "dark", "system"]).optional(),
  logoUrl: z.string().url().optional(),
});

// ─── Root AppConfig schema ────────────────────────────────────────────────────

export const appConfigSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "id must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "version must be a valid semver string"),
  description: z.string().optional(),
  updatedAt: z.string().datetime().optional(),

  database: databaseConfigSchema,
  auth: authConfigSchema,
  api: apiConfigSchema,
  ui: uiConfigSchema,

  features: z.array(featureFlagSchema).optional(),
});

// ─── Validation result types ──────────────────────────────────────────────────

export interface ValidationSuccess {
  success: true;
  data: AppConfig;
}

export interface ValidationFailure {
  success: false;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates an unknown object against the AppConfig schema.
 *
 * @param raw - The raw JSON object (e.g. parsed from a `.appforge.json` file)
 * @returns A discriminated union: { success: true, data } | { success: false, errors }
 *
 * @example
 * ```ts
 * const result = validateConfig(JSON.parse(fs.readFileSync("appforge.json", "utf-8")));
 * if (!result.success) {
 *   result.errors.forEach(e => console.error(`${e.path}: ${e.message}`));
 * }
 * ```
 */
export function validateConfig(raw: unknown): ValidationResult {
  const parsed = appConfigSchema.safeParse(raw);

  if (parsed.success) {
    return { success: true, data: parsed.data as AppConfig };
  }

  const errors = parsed.error.errors.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return { success: false, errors };
}

export { appConfigSchema as ConfigSchema };
