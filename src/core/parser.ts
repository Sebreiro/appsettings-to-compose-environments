/**
 * JSON Parser Module
 * Handles validation and parsing of appsettings.json files
 */

import type {
  JsonValue,
  JsonObject,
  ValidationResult,
  ProcessingError,
  ErrorType,
} from './types'

/**
 * Validates and parses JSON string input
 * @param input Raw JSON string
 * @returns ValidationResult with parsed data or error information
 */
export function validateJson(input: string): ValidationResult {
  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      error: 'Input is empty or contains only whitespace',
      lineNumber: 1,
      columnNumber: 1,
    }
  }

  try {
    const trimmedInput = input.trim()
    const data = JSON.parse(trimmedInput) as JsonValue

    // Ensure root is an object
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return {
        isValid: false,
        error: 'Root element must be a JSON object, not an array or primitive value',
        lineNumber: 1,
        columnNumber: 1,
      }
    }

    return {
      isValid: true,
      data: data as JsonObject,
    }
  } catch (error) {
    return parseJsonError(input, error as Error)
  }
}

/**
 * Parses JSON.parse error and extracts line/column information
 * @param input Original input string
 * @param error JSON.parse error
 * @returns ValidationResult with detailed error information
 */
function parseJsonError(input: string, error: Error): ValidationResult {
  const message = error.message
  let lineNumber = 1
  let columnNumber = 1

  // Try to extract position information from error message
  const positionMatch = message.match(/at position (\d+)/)
  if (positionMatch) {
    const position = parseInt(positionMatch[1], 10)
    const lines = input.substring(0, position).split('\n')
    lineNumber = lines.length
    columnNumber = lines[lines.length - 1].length + 1
  }

  // Try to extract line information from error message
  const lineMatch = message.match(/at line (\d+) column (\d+)/)
  if (lineMatch) {
    lineNumber = parseInt(lineMatch[1], 10)
    columnNumber = parseInt(lineMatch[2], 10)
  }

  return {
    isValid: false,
    error: sanitizeErrorMessage(message),
    lineNumber,
    columnNumber,
  }
}

/**
 * Sanitizes error messages to be user-friendly
 * @param message Raw error message
 * @returns Clean error message
 */
function sanitizeErrorMessage(message: string): string {
  // Common JSON error patterns and their user-friendly alternatives
  const errorPatterns = [
    {
      pattern: /Unexpected token.*in JSON at position/,
      replacement: 'Invalid JSON syntax - unexpected character',
    },
    {
      pattern: /Unexpected end of JSON input/,
      replacement: 'JSON is incomplete - missing closing brackets or quotes',
    },
    {
      pattern: /Expected property name or '}'/,
      replacement: 'Missing property name or closing bracket',
    },
    {
      pattern: /Unexpected string in JSON/,
      replacement: 'Unexpected string value - check for missing commas or quotes',
    },
    {
      pattern: /Unexpected number in JSON/,
      replacement: 'Unexpected number - check for missing commas',
    },
  ]

  for (const { pattern, replacement } of errorPatterns) {
    if (pattern.test(message)) {
      return replacement
    }
  }

  return message
}

/**
 * Parses appsettings.json structure and validates common patterns
 * @param data Parsed JSON object
 * @returns Processing result with warnings for unusual patterns
 */
export function parseAppSettings(data: JsonObject): {
  isValid: boolean
  warnings: string[]
  errors: ProcessingError[]
} {
  const warnings: string[] = []
  const errors: ProcessingError[] = []

  try {
    // Check for common appsettings.json sections
    validateCommonSections(data, warnings)

    // Check for potential issues
    validateStructure(data, '', warnings, errors)

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    }
  } catch (error) {
    errors.push({
      type: 'CONVERSION_FAILED',
      message: 'Failed to parse appsettings structure',
      context: { originalError: (error as Error).message },
    })

    return {
      isValid: false,
      warnings,
      errors,
    }
  }
}

/**
 * Validates common appsettings.json sections and provides warnings
 * @param data JSON object to validate
 * @param warnings Array to collect warnings
 */
function validateCommonSections(data: JsonObject, warnings: string[]): void {
  // Check for ConnectionStrings with unusual values
  if (data.ConnectionStrings && typeof data.ConnectionStrings === 'object') {
    const connectionStrings = data.ConnectionStrings as JsonObject
    Object.entries(connectionStrings).forEach(([key, value]) => {
      if (typeof value !== 'string') {
        warnings.push(`ConnectionString "${key}" is not a string value`)
      } else if (value.length === 0) {
        warnings.push(`ConnectionString "${key}" is empty`)
      }
    })
  }

  // Check for Logging configuration
  if (data.Logging && typeof data.Logging === 'object') {
    const logging = data.Logging as JsonObject
    if (logging.LogLevel && typeof logging.LogLevel === 'object') {
      const logLevel = logging.LogLevel as JsonObject
      Object.entries(logLevel).forEach(([key, value]) => {
        if (typeof value !== 'string') {
          warnings.push(`LogLevel "${key}" should be a string value`)
        }
      })
    }
  }

  // Check for array values in root (uncommon in appsettings.json)
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value) && key !== 'AllowedHosts') {
      warnings.push(`Array found at root level: "${key}" - ensure this is intentional`)
    }
  })
}

/**
 * Recursively validates JSON structure for potential conversion issues
 * @param data Current object being validated
 * @param path Current path in the object
 * @param warnings Array to collect warnings
 * @param errors Array to collect errors
 */
function validateStructure(
  data: JsonValue,
  path: string,
  warnings: string[],
  errors: ProcessingError[]
): void {
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      // Validate array elements
      data.forEach((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`
        validateStructure(item, itemPath, warnings, errors)
      })
    } else {
      // Validate object properties
      const obj = data as JsonObject
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key

        // Check for problematic key names
        if (key.includes('__')) {
          warnings.push(
            `Key "${key}" contains double underscores - may cause conflicts with converted output`
          )
        }

        if (key.includes('.')) {
          warnings.push(
            `Key "${key}" contains dots - will be converted to double underscores`
          )
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          warnings.push(
            `Key "${key}" contains special characters - ensure compatibility with your environment`
          )
        }

        // Recursively validate nested values
        validateStructure(value, newPath, warnings, errors)
      })
    }
  }

  // Check for extremely deep nesting
  const depth = path.split('.').length
  if (depth > 10) {
    warnings.push(`Very deep nesting detected at "${path}" - consider flattening structure`)
  }
}

/**
 * Creates a processing error with standardized format
 * @param type Error type
 * @param message Error message
 * @param context Additional context
 * @returns ProcessingError object
 */
export function createProcessingError(
  type: ErrorType,
  message: string,
  context?: Record<string, unknown>
): ProcessingError {
  return {
    type,
    message,
    context,
    stack: new Error().stack,
  }
}

/**
 * Utility function to safely get nested values from JSON object
 * @param obj Object to search in
 * @param path Dot-separated path (e.g., "Logging.LogLevel.Default")
 * @returns Value at path or undefined
 */
export function getNestedValue(obj: JsonObject, path: string): JsonValue | undefined {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return (current as JsonObject)[key]
    }
    return undefined
  }, obj as JsonValue)
}

/**
 * Utility function to check if a value is a primitive JSON value
 * @param value Value to check
 * @returns True if value is string, number, boolean, or null
 */
export function isPrimitiveValue(value: JsonValue): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  )
}