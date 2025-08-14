/**
 * Core module exports
 * Central export point for all core business logic
 */

// Main conversion service (recommended for UI components)
export {
  convertAppsettingsToEnvironmentVariables,
  convertToDockerCompose,
  convertToEnvFile,
  convertToPlainText,
  validateAppsettingsJson,
  getExampleUsage,
} from './conversion-service'

export type {
  ConversionServiceInput,
  ConversionServiceResult,
} from './conversion-service'

// Individual modules (for advanced use cases)
export {
  validateJson,
  parseAppSettings,
  createProcessingError,
  getNestedValue,
  isPrimitiveValue,
} from './parser'

export {
  convertToEnvironmentVariables,
  validateConversionOptions,
  analyzeConversionComplexity,
} from './converter'

export {
  formatOutput,
  validateEnvironmentVariableNames,
  createFormattedResult,
  estimateOutputSizes,
} from './formatter'

// All types
export type {
  // Basic types
  JsonValue,
  JsonObject,
  JsonArray,
  AppSettings,
  
  // Configuration types
  ConversionOptions,
  OutputFormat,
  FormatOptions,
  
  // Result types
  ValidationResult,
  ConversionResult,
  EnvironmentVariable,
  
  // Error types
  ErrorType,
  ProcessingError,
  
  // State types
  AppState,
} from './types'

// Default configurations
export {
  DEFAULT_CONVERSION_OPTIONS,
  DEFAULT_FORMAT_OPTIONS,
} from './types'

// Example usage patterns
export {
  simpleDockerComposeExample,
  advancedConversionExample,
  validationExample,
  multiFormatExample,
  errorHandlingExample,
  AppsettingsConverter,
  runAllExamples,
} from './example-usage'