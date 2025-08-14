/**
 * Conversion Service
 * High-level service that orchestrates the complete conversion workflow
 */

import { validateJson, parseAppSettings } from './parser'
import { convertToEnvironmentVariables, validateConversionOptions, analyzeConversionComplexity } from './converter'
import { createFormattedResult } from './formatter'
import type {
  ConversionOptions,
  FormatOptions,
  OutputFormat,
} from './types'
import { DEFAULT_CONVERSION_OPTIONS, DEFAULT_FORMAT_OPTIONS } from './types'

/**
 * Input parameters for the conversion service
 */
export interface ConversionServiceInput {
  /** Raw JSON string to convert */
  jsonInput: string
  /** Output format (docker-compose, env-file, plain-text) */
  outputFormat: OutputFormat
  /** Conversion options (optional, defaults will be used) */
  conversionOptions?: Partial<ConversionOptions>
  /** Format-specific options (optional, defaults will be used) */
  formatOptions?: Partial<FormatOptions>
}

/**
 * Result from the conversion service
 */
export interface ConversionServiceResult {
  /** Whether the conversion was successful */
  success: boolean
  /** Formatted output if successful */
  output?: string
  /** Environment variables generated */
  environmentVariables?: Array<{
    key: string
    value: string
    originalPath: string
    originalType: string
  }>
  /** Any warnings during conversion */
  warnings: string[]
  /** Error information if conversion failed */
  error?: {
    type: 'VALIDATION_FAILED' | 'CONVERSION_FAILED' | 'FORMATTING_FAILED'
    message: string
    details?: string
    lineNumber?: number
    columnNumber?: number
  }
  /** Statistics about the conversion */
  stats?: {
    totalVariables: number
    maxDepth: number
    arrayCount: number
    recommendations: string[]
  }
}

/**
 * Main conversion service function
 * Orchestrates the complete JSON to environment variables conversion workflow
 * 
 * @param input Conversion parameters
 * @returns Promise<ConversionServiceResult> Complete conversion result
 */
export async function convertAppsettingsToEnvironmentVariables(
  input: ConversionServiceInput
): Promise<ConversionServiceResult> {
  const warnings: string[] = []

  try {
    // Step 1: Validate and parse JSON
    const validation = validateJson(input.jsonInput)
    if (!validation.isValid) {
      return {
        success: false,
        warnings: [],
        error: {
          type: 'VALIDATION_FAILED',
          message: validation.error || 'JSON validation failed',
          lineNumber: validation.lineNumber,
          columnNumber: validation.columnNumber,
        },
      }
    }

    // Step 2: Parse AppSettings structure and collect warnings
    const appSettingsValidation = parseAppSettings(validation.data!)
    warnings.push(...appSettingsValidation.warnings)

    if (!appSettingsValidation.isValid) {
      return {
        success: false,
        warnings,
        error: {
          type: 'VALIDATION_FAILED',
          message: 'AppSettings structure validation failed',
          details: appSettingsValidation.errors.map(e => e.message).join('; '),
        },
      }
    }

    // Step 3: Validate and prepare conversion options
    const conversionOptions = validateConversionOptions(
      input.conversionOptions || DEFAULT_CONVERSION_OPTIONS
    )

    // Step 4: Convert JSON to environment variables
    const conversionResult = convertToEnvironmentVariables(validation.data!, conversionOptions)
    if (!conversionResult.success) {
      return {
        success: false,
        warnings: [...warnings, ...conversionResult.warnings],
        error: {
          type: 'CONVERSION_FAILED',
          message: conversionResult.error || 'Conversion to environment variables failed',
        },
      }
    }

    warnings.push(...conversionResult.warnings)

    // Step 5: Prepare format options
    const formatOptions: FormatOptions = {
      ...DEFAULT_FORMAT_OPTIONS,
      ...input.formatOptions,
    }

    // Step 6: Format the output
    const formattedResult = createFormattedResult(
      conversionResult.environmentVariables,
      input.outputFormat,
      formatOptions,
      warnings
    )

    if (!formattedResult.success) {
      return {
        success: false,
        warnings: formattedResult.warnings,
        error: {
          type: 'FORMATTING_FAILED',
          message: formattedResult.error || 'Output formatting failed',
        },
      }
    }

    // Step 7: Generate statistics and recommendations
    const complexityStats = analyzeConversionComplexity(validation.data!)
    const stats = {
      totalVariables: complexityStats.totalKeys,
      maxDepth: complexityStats.maxDepth,
      arrayCount: complexityStats.arrayCount,
      recommendations: complexityStats.recommendations,
    }

    // Step 8: Return successful result
    return {
      success: true,
      output: formattedResult.formattedOutput,
      environmentVariables: conversionResult.environmentVariables.map(env => ({
        key: env.key,
        value: env.value,
        originalPath: env.originalPath,
        originalType: env.originalType,
      })),
      warnings: formattedResult.warnings,
      stats,
    }

  } catch (error) {
    return {
      success: false,
      warnings,
      error: {
        type: 'CONVERSION_FAILED',
        message: 'Unexpected error during conversion',
        details: (error as Error).message,
      },
    }
  }
}

/**
 * Convenience function for Docker Compose conversion
 * @param jsonInput Raw JSON string
 * @param options Optional conversion options
 * @returns Promise<ConversionServiceResult>
 */
export async function convertToDockerCompose(
  jsonInput: string,
  options?: {
    conversionOptions?: Partial<ConversionOptions>
    useArrayFormat?: boolean
    indentLevel?: number
  }
): Promise<ConversionServiceResult> {
  return convertAppsettingsToEnvironmentVariables({
    jsonInput,
    outputFormat: 'docker-compose',
    conversionOptions: options?.conversionOptions,
    formatOptions: {
      dockerCompose: {
        useArrayFormat: options?.useArrayFormat ?? true,
        indentLevel: options?.indentLevel ?? 2,
      },
      envFile: DEFAULT_FORMAT_OPTIONS.envFile,
      plainText: DEFAULT_FORMAT_OPTIONS.plainText,
    },
  })
}

/**
 * Convenience function for .env file conversion
 * @param jsonInput Raw JSON string
 * @param options Optional conversion options
 * @returns Promise<ConversionServiceResult>
 */
export async function convertToEnvFile(
  jsonInput: string,
  options?: {
    conversionOptions?: Partial<ConversionOptions>
    includeComments?: boolean
    quoteValues?: boolean
  }
): Promise<ConversionServiceResult> {
  return convertAppsettingsToEnvironmentVariables({
    jsonInput,
    outputFormat: 'env-file',
    conversionOptions: options?.conversionOptions,
    formatOptions: {
      dockerCompose: DEFAULT_FORMAT_OPTIONS.dockerCompose,
      envFile: {
        includeComments: options?.includeComments ?? true,
        quoteValues: options?.quoteValues ?? true,
      },
      plainText: DEFAULT_FORMAT_OPTIONS.plainText,
    },
  })
}

/**
 * Convenience function for plain text conversion
 * @param jsonInput Raw JSON string
 * @param options Optional conversion options
 * @returns Promise<ConversionServiceResult>
 */
export async function convertToPlainText(
  jsonInput: string,
  options?: {
    conversionOptions?: Partial<ConversionOptions>
    includeExport?: boolean
    separator?: string
  }
): Promise<ConversionServiceResult> {
  return convertAppsettingsToEnvironmentVariables({
    jsonInput,
    outputFormat: 'plain-text',
    conversionOptions: options?.conversionOptions,
    formatOptions: {
      dockerCompose: DEFAULT_FORMAT_OPTIONS.dockerCompose,
      envFile: DEFAULT_FORMAT_OPTIONS.envFile,
      plainText: {
        separator: options?.separator ?? '=',
        includeExport: options?.includeExport ?? false,
      },
    },
  })
}

/**
 * Quick validation function that only checks if JSON is valid AppSettings
 * @param jsonInput Raw JSON string
 * @returns Validation result with warnings
 */
export async function validateAppsettingsJson(jsonInput: string): Promise<{
  isValid: boolean
  warnings: string[]
  error?: string
  lineNumber?: number
  columnNumber?: number
}> {
  try {
    const validation = validateJson(jsonInput)
    if (!validation.isValid) {
      return {
        isValid: false,
        warnings: [],
        error: validation.error,
        lineNumber: validation.lineNumber,
        columnNumber: validation.columnNumber,
      }
    }

    const appSettingsValidation = parseAppSettings(validation.data!)
    return {
      isValid: appSettingsValidation.isValid,
      warnings: appSettingsValidation.warnings,
      error: appSettingsValidation.errors.length > 0
        ? appSettingsValidation.errors.map(e => e.message).join('; ')
        : undefined,
    }
  } catch (error) {
    return {
      isValid: false,
      warnings: [],
      error: (error as Error).message,
    }
  }
}


/**
 * Gets example usage for the service
 */
export function getExampleUsage(): {
  basicUsage: string
  advancedUsage: string
  validationOnly: string
} {
  return {
    basicUsage: `
// Basic Docker Compose conversion
const result = await convertToDockerCompose(jsonString);
if (result.success) {
  console.log(result.output);
} else {
  console.error(result.error?.message);
}`,

    advancedUsage: `
// Advanced conversion with custom options
const result = await convertAppsettingsToEnvironmentVariables({
  jsonInput: jsonString,
  outputFormat: 'env-file',
  conversionOptions: {
    prefix: 'APP_',
    namingConvention: 'uppercase',
    nullHandling: 'omit'
  },
  formatOptions: {
    envFile: {
      includeComments: true,
      quoteValues: false
    }
  }
});`,

    validationOnly: `
// Just validate JSON without conversion
const validation = await validateAppsettingsJson(jsonString);
if (!validation.isValid) {
  console.error(validation.error);
}
console.log('Warnings:', validation.warnings);`,
  }
}