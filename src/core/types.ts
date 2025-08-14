/**
 * Core type definitions for the AppSettings to Docker Compose converter
 */

// Base type for any JSON value
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray

export interface JsonObject {
  [key: string]: JsonValue
}

export interface JsonArray extends Array<JsonValue> {}

/**
 * Represents the structure of an appsettings.json file
 */
export interface AppSettings extends JsonObject {
  ConnectionStrings?: Record<string, string>
  Logging?: {
    LogLevel?: Record<string, string>
  }
  AllowedHosts?: string | string[]
  [key: string]: JsonValue
}

/**
 * Configuration options for the conversion process
 */
export interface ConversionOptions {
  /** Prefix to add to all environment variable names */
  prefix?: string
  /** Naming convention for output keys */
  namingConvention: 'preserve' | 'uppercase' | 'lowercase'
  /** Whether to include type hints in comments */
  includeTypeHints: boolean
  /** Separator for nested keys (default: '__') */
  keySeparator: string
  /** How to handle null values */
  nullHandling: 'empty' | 'omit' | 'null'
  /** Whether to include array indices */
  includeArrayIndices: boolean
}

/**
 * Available output formats
 */
export type OutputFormat = 'docker-compose' | 'env-file' | 'plain-text'

/**
 * Format-specific options
 */
export interface FormatOptions {
  /** Docker Compose specific options */
  dockerCompose: {
    /** Use array format or individual lines */
    useArrayFormat: boolean
    /** Indent level for YAML */
    indentLevel: number
  }
  /** .env file specific options */
  envFile: {
    /** Include comments with original structure */
    includeComments: boolean
    /** Quote values that contain special characters */
    quoteValues: boolean
  }
  /** Plain text specific options */
  plainText: {
    /** Separator between key and value */
    separator: string
    /** Include export keyword for shell */
    includeExport: boolean
  }
}

/**
 * Result of JSON validation
 */
export interface ValidationResult {
  /** Whether the JSON is valid */
  isValid: boolean
  /** Error message if validation failed */
  error?: string
  /** Line number where error occurred */
  lineNumber?: number
  /** Column number where error occurred */
  columnNumber?: number
  /** Parsed JSON object if validation succeeded */
  data?: JsonObject
}

/**
 * Result of the conversion process
 */
export interface ConversionResult {
  /** Whether conversion was successful */
  success: boolean
  /** Converted environment variables */
  environmentVariables: EnvironmentVariable[]
  /** Formatted output based on selected format */
  formattedOutput: string
  /** Any warnings or issues encountered */
  warnings: string[]
  /** Error message if conversion failed */
  error?: string
}

/**
 * Represents a single environment variable
 */
export interface EnvironmentVariable {
  /** The environment variable key */
  key: string
  /** The environment variable value */
  value: string
  /** Original JSON path */
  originalPath: string
  /** Data type of original value */
  originalType: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'
  /** Whether this variable was derived from an array element */
  isArrayElement: boolean
  /** Array index if this is an array element */
  arrayIndex?: number
}

/**
 * Error types that can occur during processing
 */
export type ErrorType = 
  | 'INVALID_JSON'
  | 'EMPTY_INPUT'
  | 'UNSUPPORTED_TYPE'
  | 'CONVERSION_FAILED'
  | 'FORMAT_ERROR'

/**
 * Structured error information
 */
export interface ProcessingError {
  /** Type of error */
  type: ErrorType
  /** Human-readable error message */
  message: string
  /** Additional context about the error */
  context?: Record<string, unknown>
  /** Stack trace if available */
  stack?: string
}

/**
 * Application state for UI components
 */
export interface AppState {
  /** Current JSON input */
  jsonInput: string
  /** Current conversion options */
  conversionOptions: ConversionOptions
  /** Selected output format */
  outputFormat: OutputFormat
  /** Format-specific options */
  formatOptions: FormatOptions
  /** Last validation result */
  validationResult: ValidationResult | null
  /** Last conversion result */
  conversionResult: ConversionResult | null
  /** Current processing state */
  isProcessing: boolean
  /** Any processing errors */
  errors: ProcessingError[]
}

/**
 * Default conversion options
 */
export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  prefix: '',
  namingConvention: 'preserve',
  includeTypeHints: false,
  keySeparator: '__',
  nullHandling: 'empty',
  includeArrayIndices: true,
}

/**
 * Default format options
 */
export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  dockerCompose: {
    useArrayFormat: true,
    indentLevel: 2,
  },
  envFile: {
    includeComments: true,
    quoteValues: true,
  },
  plainText: {
    separator: '=',
    includeExport: false,
  },
}