/**
 * @appforge/config-types
 *
 * Shared TypeScript types for AppForge JSON configuration files.
 * These types are consumed by both the API and the web frontend.
 */

// ─── Primitive helpers ────────────────────────────────────────────────────────

export type ISODateString = string; // "2024-01-15T12:00:00Z"
export type SemVer = string;        // "1.0.0"

// ─── Feature flag ────────────────────────────────────────────────────────────

export interface FeatureFlag {
  /** Unique identifier for this flag */
  name: string;
  /** Whether the flag is enabled */
  enabled: boolean;
  /** Optional description shown in the UI */
  description?: string;
}

// ─── Database config ─────────────────────────────────────────────────────────

export type DatabaseDriver = "postgres" | "mysql" | "sqlite" | "mongodb";

export interface DatabaseConfig {
  driver: DatabaseDriver;
  /** Connection string (use env-var reference: "$DATABASE_URL") */
  url: string;
  /** Max connections in the pool (default: 10) */
  poolSize?: number;
  ssl?: boolean;
}

// ─── Auth config ─────────────────────────────────────────────────────────────

export type AuthStrategy = "jwt" | "session" | "oauth2";

export interface AuthConfig {
  strategy: AuthStrategy;
  /** Token expiry, e.g. "7d", "1h" */
  tokenExpiry?: string;
  providers?: Array<"google" | "github" | "discord">;
}

// ─── API config ───────────────────────────────────────────────────────────────

export interface ApiConfig {
  /** Port the Express server binds to */
  port: number;
  /** CORS allowed origins */
  corsOrigins: string[];
  /** Rate limit: max requests per windowMs */
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

// ─── UI / Frontend config ────────────────────────────────────────────────────

export type ColorScheme = "light" | "dark" | "system";

export interface UiConfig {
  /** App display name shown in browser title / nav */
  appName: string;
  /** Primary brand color (hex) */
  primaryColor?: string;
  defaultColorScheme?: ColorScheme;
  logoUrl?: string;
}

// ─── Root AppConfig ───────────────────────────────────────────────────────────

/**
 * Root configuration object for an AppForge-generated application.
 *
 * This interface will be extended in future steps with pages, routes,
 * permissions, integrations, and deployment targets.
 */
export interface AppConfig {
  /** Unique machine-readable identifier for this app */
  id: string;
  /** Human-readable name */
  name: string;
  /** SemVer config schema version */
  version: SemVer;
  /** Brief description shown in the AppForge dashboard */
  description?: string;
  /** ISO timestamp of when this config was last updated */
  updatedAt?: ISODateString;

  database: DatabaseConfig;
  auth: AuthConfig;
  api: ApiConfig;
  ui: UiConfig;

  features?: FeatureFlag[];
}

// ─── Re-export everything as a namespace for convenience ─────────────────────

export type { AppConfig as default };
