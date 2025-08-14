/**
 * Conversion Engine
 * Transforms parsed JSON into environment variables
 */

import type {
  JsonValue,
  JsonObject,
  ConversionOptions,
  EnvironmentVariable,
  ConversionResult,
  ProcessingError,
} from './types'

/**
 * Converts a JSON object to environment variables
 * @param data Parsed JSON object
 * @param options Conversion options
 * @returns ConversionResult with environment variables and any errors
 */
export function convertToEnvironmentVariables(
  data: JsonObject,
  options: ConversionOptions
): ConversionResult {
  const warnings: string[] = []
  const errors: ProcessingError[] = []
  const environmentVariables: EnvironmentVariable[] = []

  try {
    flattenObject(data, '', environmentVariables, options, warnings)

    return {
      success: true,
      environmentVariables,
      formattedOutput: '', // Will be set by formatter
      warnings,
    }
  } catch (error) {
    errors.push({
      type: 'CONVERSION_FAILED',
      message: 'Failed to convert JSON to environment variables',
      context: { originalError: (error as Error).message },
    })

    return {
      success: false,
      environmentVariables: [],
      formattedOutput: '',
      warnings,
      error: (error as Error).message,
    }
  }
}

/**
 * Recursively flattens a JSON object into environment variables
 * @param obj Current object being processed
 * @param prefix Current key prefix
 * @param result Array to store resulting environment variables
 * @param options Conversion options
 * @param warnings Array to collect warnings
 */
function flattenObject(
  obj: JsonValue,
  prefix: string,
  result: EnvironmentVariable[],
  options: ConversionOptions,
  warnings: string[]
): void {
  if (obj === null) {
    handleNullValue(prefix, result, options)
    return
  }

  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      handleArray(obj, prefix, result, options, warnings)
    } else {
      handleObject(obj as JsonObject, prefix, result, options, warnings)
    }
  } else {
    // Primitive value
    const envVar = createEnvironmentVariable(
      prefix,
      obj,
      prefix.replace(new RegExp(escapeRegex(options.keySeparator), 'g'), '.'),
      typeof obj as 'string' | 'number' | 'boolean',
      false,
      options
    )
    result.push(envVar)
  }
}

/**
 * Handles null values according to conversion options
 * @param prefix Current key prefix
 * @param result Array to store resulting environment variables
 * @param options Conversion options
 */
function handleNullValue(
  prefix: string,
  result: EnvironmentVariable[],
  options: ConversionOptions
): void {
  if (options.nullHandling === 'omit') {
    return // Skip null values
  }

  const value = options.nullHandling === 'null' ? 'null' : ''
  const envVar = createEnvironmentVariable(
    prefix,
    value,
    prefix.replace(new RegExp(escapeRegex(options.keySeparator), 'g'), '.'),
    'null',
    false,
    options
  )
  result.push(envVar)
}

/**
 * Handles array values
 * @param arr Array to process
 * @param prefix Current key prefix
 * @param result Array to store resulting environment variables
 * @param options Conversion options
 * @param warnings Array to collect warnings
 */
function handleArray(
  arr: JsonValue[],
  prefix: string,
  result: EnvironmentVariable[],
  options: ConversionOptions,
  warnings: string[]
): void {
  if (arr.length === 0) {
    warnings.push(`Empty array found at path: ${prefix}`)
    return
  }

  if (!options.includeArrayIndices) {
    // If not including indices, convert array to comma-separated string
    const stringValue = arr
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          warnings.push(`Complex object in array at ${prefix} - converted to [object Object]`)
          return '[object Object]'
        }
        return String(item)
      })
      .join(',')

    const envVar = createEnvironmentVariable(
      prefix,
      stringValue,
      prefix.replace(new RegExp(escapeRegex(options.keySeparator), 'g'), '.'),
      'array',
      false,
      options
    )
    result.push(envVar)
    return
  }

  // Include array indices
  arr.forEach((item, index) => {
    const indexedPrefix = `${prefix}${options.keySeparator}${index}`
    const originalPath = `${prefix.replace(
      new RegExp(escapeRegex(options.keySeparator), 'g'),
      '.'
    )}[${index}]`

    if (typeof item === 'object' && item !== null) {
      flattenObject(item, indexedPrefix, result, options, warnings)
    } else {
      const envVar = createEnvironmentVariable(
        indexedPrefix,
        item,
        originalPath,
        typeof item as 'string' | 'number' | 'boolean' | 'null',
        true,
        options,
        index
      )
      result.push(envVar)
    }
  })
}

/**
 * Handles object values
 * @param obj Object to process
 * @param prefix Current key prefix
 * @param result Array to store resulting environment variables
 * @param options Conversion options
 * @param warnings Array to collect warnings
 */
function handleObject(
  obj: JsonObject,
  prefix: string,
  result: EnvironmentVariable[],
  options: ConversionOptions,
  warnings: string[]
): void {
  Object.entries(obj).forEach(([key, value]) => {
    const cleanKey = sanitizeKey(key, warnings)
    const newPrefix = prefix ? `${prefix}${options.keySeparator}${cleanKey}` : cleanKey
    flattenObject(value, newPrefix, result, options, warnings)
  })
}

/**
 * Creates an environment variable object
 * @param key The environment variable key
 * @param value The value (before transformation)
 * @param originalPath Original JSON path
 * @param originalType Original data type
 * @param isArrayElement Whether this is from an array
 * @param options Conversion options
 * @param arrayIndex Array index if applicable
 * @returns EnvironmentVariable object
 */
function createEnvironmentVariable(
  key: string,
  value: JsonValue,
  originalPath: string,
  originalType: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array',
  isArrayElement: boolean,
  options: ConversionOptions,
  arrayIndex?: number
): EnvironmentVariable {
  // Transform key according to naming convention
  const transformedKey = transformKeyName(key, options)

  // Add prefix if specified
  const finalKey = options.prefix ? `${options.prefix}${transformedKey}` : transformedKey

  // Convert value to string
  const stringValue = convertValueToString(value)

  return {
    key: finalKey,
    value: stringValue,
    originalPath,
    originalType,
    isArrayElement,
    arrayIndex,
  }
}

/**
 * Transforms a key according to naming convention
 * @param key Original key
 * @param options Conversion options
 * @returns Transformed key
 */
function transformKeyName(key: string, options: ConversionOptions): string {
  switch (options.namingConvention) {
    case 'uppercase':
      return key.toUpperCase()
    case 'lowercase':
      return key.toLowerCase()
    case 'preserve':
    default:
      return key
  }
}

/**
 * Sanitizes a key for use as an environment variable
 * @param key Original key
 * @param warnings Array to collect warnings
 * @returns Sanitized key
 */
function sanitizeKey(key: string, warnings: string[]): string {
  let sanitized = key

  // Replace dots with double underscores (common in .NET config)
  if (sanitized.includes('.')) {
    sanitized = sanitized.replace(/\./g, '__')
    warnings.push(`Replaced dots in key "${key}" with double underscores`)
  }

  // Handle other special characters
  const originalKey = sanitized
  sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '_')

  if (originalKey !== sanitized) {
    warnings.push(`Replaced special characters in key "${key}" with underscores`)
  }

  // Ensure key starts with letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = `_${sanitized}`
    warnings.push(`Prefixed key "${key}" with underscore to ensure valid identifier`)
  }

  return sanitized
}

/**
 * Converts a JSON value to its string representation
 * @param value JSON value to convert
 * @returns String representation
 */
function convertValueToString(value: JsonValue): string {
  if (value === null) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value.toString().toLowerCase()
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  if (typeof value === 'string') {
    return value
  }

  // Objects and arrays should not reach here in normal flow
  return JSON.stringify(value)
}

/**
 * Escapes special regex characters
 * @param string String to escape
 * @returns Escaped string
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Validates conversion options and provides defaults
 * @param options Partial conversion options
 * @returns Complete ConversionOptions with validated values
 */
export function validateConversionOptions(options: Partial<ConversionOptions>): ConversionOptions {
  const defaults: ConversionOptions = {
    prefix: '',
    namingConvention: 'preserve',
    includeTypeHints: false,
    keySeparator: '__',
    nullHandling: 'empty',
    includeArrayIndices: true,
  }

  const validated = { ...defaults, ...options }

  // Validate keySeparator
  if (!validated.keySeparator || validated.keySeparator.length === 0) {
    validated.keySeparator = '__'
  }

  // Validate prefix (remove invalid characters)
  if (validated.prefix) {
    const originalPrefix = validated.prefix
    validated.prefix = validated.prefix.replace(/[^a-zA-Z0-9_]/g, '_')
    
    if (!validated.prefix.endsWith('_') && validated.prefix.length > 0) {
      validated.prefix += '_'
    }

    // Ensure prefix starts with letter or underscore
    if (validated.prefix && !/^[a-zA-Z_]/.test(validated.prefix)) {
      validated.prefix = `_${validated.prefix}`
    }
  }

  return validated
}

/**
 * Analyzes conversion complexity and provides recommendations
 * @param data JSON object to analyze
 * @returns Analysis results with recommendations
 */
export function analyzeConversionComplexity(data: JsonObject): {
  totalKeys: number
  maxDepth: number
  arrayCount: number
  recommendations: string[]
} {
  const stats = {
    totalKeys: 0,
    maxDepth: 0,
    arrayCount: 0,
    recommendations: [] as string[],
  }

  analyzeObjectComplexity(data, 1, stats)

  // Generate recommendations
  if (stats.totalKeys > 100) {
    stats.recommendations.push(
      'Large configuration detected - consider splitting into multiple files'
    )
  }

  if (stats.maxDepth > 6) {
    stats.recommendations.push(
      'Deep nesting detected - consider flattening configuration structure'
    )
  }

  if (stats.arrayCount > 10) {
    stats.recommendations.push(
      'Many arrays detected - ensure array handling matches your deployment needs'
    )
  }

  return stats
}

/**
 * Recursively analyzes object complexity
 * @param obj Object to analyze
 * @param depth Current depth
 * @param stats Stats object to update
 */
function analyzeObjectComplexity(
  obj: JsonValue,
  depth: number,
  stats: { totalKeys: number; maxDepth: number; arrayCount: number }
): void {
  stats.maxDepth = Math.max(stats.maxDepth, depth)

  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      stats.arrayCount++
      obj.forEach((item) => analyzeObjectComplexity(item, depth + 1, stats))
    } else {
      const objectKeys = Object.keys(obj as JsonObject)
      stats.totalKeys += objectKeys.length

      Object.values(obj as JsonObject).forEach((value) => {
        analyzeObjectComplexity(value, depth + 1, stats)
      })
    }
  }
}