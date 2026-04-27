/**
 * @appforge/config-types
 *
 * Shared TypeScript types for AppForge JSON configuration files.
 * These types define the structure for generating applications.
 */

// ─── Primitive helpers ────────────────────────────────────────────────────────

export type ISODateString = string; // "2024-01-15T12:00:00Z"
export type SemVer = string;        // "1.0.0"

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Rules for validating a field's value.
 */
export interface ValidationRule {
  type: "min" | "max" | "minLength" | "maxLength" | "pattern" | "custom";
  value: unknown;
  message: string;
}

// ─── Fields ───────────────────────────────────────────────────────────────────

/**
 * Configuration for a data field.
 */
export interface FieldConfig {
  /** The name of the field */
  name: string;
  /** The data type of the field */
  type: "string" | "number" | "boolean" | "date" | "email" | "enum" | "relation";
  /** Whether the field must be provided */
  required?: boolean;
  /** The default value for the field */
  defaultValue?: unknown;
  /** Allowed options if type is "enum" */
  options?: string[];
  /** The related table if type is "relation" */
  relatedTable?: string;
  /** Validation rules for the field */
  validation?: ValidationRule[];
}

// ─── Database ─────────────────────────────────────────────────────────────────

/**
 * Configuration for a database table.
 */
export interface TableConfig {
  /** Snake_case name of the table */
  name: string;
  /** Fields defining the table's schema */
  fields: FieldConfig[];
  /** Whether to automatically add createdAt and updatedAt columns */
  timestamps?: boolean;
}

/**
 * Configuration for the database schema.
 */
export interface DatabaseConfig {
  tables: TableConfig[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Configuration for user authentication.
 */
export interface AuthConfig {
  /** Whether authentication is enabled */
  enabled: boolean;
  /** The authentication provider */
  provider: "email" | "oauth_google";
  /** Custom login/signup fields */
  fields?: FieldConfig[];
}

// ─── Components & Pages ───────────────────────────────────────────────────────

export interface WidgetConfig {
  type: "count" | "chart_bar" | "chart_line" | "stat";
  table: string;
  field?: string;
  label: string;
  filter?: Record<string, unknown>;
}

export interface FormComponentConfig {
  type: "form";
  table: string;
  fields?: string[];
  submitLabel?: string;
  onSuccess?: "redirect" | "reset";
  redirectTo?: string;
}

export interface TableComponentConfig {
  type: "table";
  table: string;
  columns?: string[];
  searchable?: boolean;
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
}

export interface DashboardComponentConfig {
  type: "dashboard";
  widgets: WidgetConfig[];
}

export interface CsvImportComponentConfig {
  type: "csv_import";
  table: string;
  fieldMapping?: Record<string, string>;
}

export interface UnknownComponentConfig {
  type: "unknown";
  raw: unknown;
}

/**
 * Configuration for UI components.
 * This is a discriminated union of available component types.
 */
export type ComponentConfig =
  | FormComponentConfig
  | TableComponentConfig
  | DashboardComponentConfig
  | CsvImportComponentConfig
  | UnknownComponentConfig;

/**
 * Configuration for a UI page.
 */
export interface PageConfig {
  /** Unique identifier for the page */
  id: string;
  /** URL path for the page */
  path: string;
  /** Page title */
  title: string;
  /** Whether login is required to view the page */
  auth?: boolean;
  /** Components rendered on the page */
  components: ComponentConfig[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Configuration for an API endpoint.
 */
export interface ApiConfig {
  /** The URL path for the endpoint */
  path: string;
  /** The HTTP method for the endpoint */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** The table this endpoint interacts with */
  table: string;
  /** The action performed by the endpoint */
  action: "list" | "create" | "read" | "update" | "delete" | "custom";
  /** Whether login is required to access the endpoint */
  auth?: boolean;
  /** Validation rules for the request body, keyed by field name */
  validation?: Record<string, ValidationRule[]>;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationEvent {
  trigger: "on_create" | "on_update" | "on_delete" | "custom";
  table?: string;
  channel: "email" | "in_app";
  template: string;
  recipients: "creator" | "all" | string[];
}

/**
 * Configuration for system notifications.
 */
export interface NotificationConfig {
  events: NotificationEvent[];
}

// ─── I18n ─────────────────────────────────────────────────────────────────────

/**
 * Configuration for internationalization.
 */
export interface I18nConfig {
  defaultLocale: string;
  locales: string[];
  translations?: Record<string, Record<string, string>>;
}

// ─── Root AppConfig ───────────────────────────────────────────────────────────

/**
 * Root configuration object for an AppForge-generated application.
 */
export interface AppConfig {
  /** Unique machine-readable identifier for this app */
  id: string;
  /** Human-readable name */
  name: string;
  /** SemVer config schema version */
  version: SemVer;
  
  auth?: AuthConfig;
  database: DatabaseConfig;
  pages: PageConfig[];
  api: ApiConfig[];
  notifications?: NotificationConfig;
  i18n?: I18nConfig;
}

// ─── Re-export everything as a namespace for convenience ─────────────────────

export type { AppConfig as default };
