/**
 * Output Formatter Module
 * Formats environment variables into different output formats
 */

import type {
  EnvironmentVariable,
  OutputFormat,
  FormatOptions,
  ConversionResult,
} from './types'

/**
 * Formats environment variables according to the specified output format
 * @param envVars Array of environment variables
 * @param format Target output format
 * @param formatOptions Format-specific options
 * @returns Formatted output string
 */
export function formatOutput(
  envVars: EnvironmentVariable[],
  format: OutputFormat,
  formatOptions: FormatOptions
): string {
  switch (format) {
    case 'docker-compose':
      return formatDockerCompose(envVars, formatOptions.dockerCompose)
    case 'env-file':
      return formatEnvFile(envVars, formatOptions.envFile)
    case 'plain-text':
      return formatPlainText(envVars, formatOptions.plainText)
    default:
      throw new Error(`Unsupported output format: ${format}`)
  }
}

/**
 * Formats environment variables for Docker Compose YAML
 * @param envVars Array of environment variables
 * @param options Docker Compose specific options
 * @returns Docker Compose YAML fragment
 */
function formatDockerCompose(
  envVars: EnvironmentVariable[],
  options: { useArrayFormat: boolean; indentLevel: number }
): string {
  const indent = ' '.repeat(options.indentLevel)
  
  if (options.useArrayFormat) {
    const lines = ['environment:']
    envVars.forEach((envVar) => {
      const value = escapeYamlValue(envVar.value)
      lines.push(`${indent}- ${envVar.key}=${value}`)
    })
    return lines.join('\n')
  } else {
    const lines = ['environment:']
    envVars.forEach((envVar) => {
      const value = escapeYamlValue(envVar.value)
      lines.push(`${indent}${envVar.key}: ${value}`)
    })
    return lines.join('\n')
  }
}

/**
 * Formats environment variables as .env file
 * @param envVars Array of environment variables
 * @param options .env file specific options
 * @returns .env file content
 */
function formatEnvFile(
  envVars: EnvironmentVariable[],
  options: { includeComments: boolean; quoteValues: boolean }
): string {
  const lines: string[] = []

  if (options.includeComments) {
    lines.push('# Generated from appsettings.json')
    lines.push('# This file contains environment variables for your application')
    lines.push('')
  }

  // Group variables by section for better organization
  const grouped = groupVariablesBySection(envVars)
  
  Object.entries(grouped).forEach(([section, vars]) => {
    if (options.includeComments && section !== 'root') {
      lines.push(`# ${section} configuration`)
    }

    vars.forEach((envVar) => {
      const value = options.quoteValues 
        ? escapeEnvValue(envVar.value, true)
        : escapeEnvValue(envVar.value, false)

      if (options.includeComments && envVar.originalType !== 'string') {
        lines.push(`# Original type: ${envVar.originalType}`)
        if (envVar.originalPath) {
          lines.push(`# JSON path: ${envVar.originalPath}`)
        }
      }

      lines.push(`${envVar.key}=${value}`)
    })

    lines.push('') // Empty line between sections
  })

  // Remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines.join('\n')
}

/**
 * Formats environment variables as plain text
 * @param envVars Array of environment variables
 * @param options Plain text specific options
 * @returns Plain text output
 */
function formatPlainText(
  envVars: EnvironmentVariable[],
  options: { separator: string; includeExport: boolean }
): string {
  const lines: string[] = []

  envVars.forEach((envVar) => {
    const value = escapeShellValue(envVar.value)
    const prefix = options.includeExport ? 'export ' : ''
    lines.push(`${prefix}${envVar.key}${options.separator}${value}`)
  })

  return lines.join('\n')
}

/**
 * Groups environment variables by their top-level section
 * @param envVars Array of environment variables
 * @returns Grouped variables by section
 */
function groupVariablesBySection(
  envVars: EnvironmentVariable[]
): Record<string, EnvironmentVariable[]> {
  const grouped: Record<string, EnvironmentVariable[]> = {}

  envVars.forEach((envVar) => {
    const section = extractTopLevelSection(envVar.key)
    if (!grouped[section]) {
      grouped[section] = []
    }
    grouped[section].push(envVar)
  })

  return grouped
}

/**
 * Extracts the top-level section name from an environment variable key
 * @param key Environment variable key
 * @returns Section name
 */
function extractTopLevelSection(key: string): string {
  const parts = key.split('__')
  if (parts.length > 1) {
    return parts[0]
  }
  return 'root'
}

/**
 * Escapes a value for use in YAML
 * @param value Value to escape
 * @returns Escaped YAML value
 */
function escapeYamlValue(value: string): string {
  if (value === '') {
    return '""'
  }

  // Values that need quoting in YAML
  const needsQuoting = 
    /^(true|false|null|yes|no|on|off|\d+\.?\d*|[0-9]+e[0-9]+)$/i.test(value) ||
    /^[+-]/.test(value) ||
    /[:\[\]{}|>*&!%@`]/.test(value) ||
    /^\s/.test(value) ||
    /\s$/.test(value) ||
    value.includes('#') ||
    value.includes('"') ||
    value.includes("'")

  if (needsQuoting) {
    // Use double quotes and escape internal quotes
    return `"${value.replace(/"/g, '\\"')}"`
  }

  return value
}

/**
 * Escapes a value for use in .env files
 * @param value Value to escape
 * @param forceQuotes Whether to always quote the value
 * @returns Escaped .env value
 */
function escapeEnvValue(value: string, forceQuotes: boolean): string {
  if (value === '') {
    return '""'
  }

  const hasSpaces = /\s/.test(value)
  const hasSpecialChars = /[#"'$\\`]/.test(value)
  const needsQuoting = forceQuotes || hasSpaces || hasSpecialChars

  if (needsQuoting) {
    // Use double quotes and escape special characters
    let escaped = value
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/"/g, '\\"')    // Escape double quotes
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t')   // Escape tabs

    return `"${escaped}"`
  }

  return value
}

/**
 * Escapes a value for use in shell
 * @param value Value to escape
 * @returns Escaped shell value
 */
function escapeShellValue(value: string): string {
  if (value === '') {
    return "''"
  }

  // If value contains only safe characters, return as-is
  if (/^[a-zA-Z0-9_./:-]+$/.test(value)) {
    return value
  }

  // Use single quotes to avoid most shell interpretation
  // Escape single quotes by ending the quoted string, adding an escaped quote, and starting a new quoted string
  const escaped = value.replace(/'/g, "'\"'\"'")
  return `'${escaped}'`
}

/**
 * Adds type hint comments to formatted output
 * @param envVar Environment variable
 * @param includeTypeHints Whether to include type hints
 * @returns Comment line or empty string
 */
function generateTypeHintComment(envVar: EnvironmentVariable, includeTypeHints: boolean): string {
  if (!includeTypeHints) {
    return ''
  }

  const hints: string[] = []
  
  if (envVar.originalType !== 'string') {
    hints.push(`type: ${envVar.originalType}`)
  }

  if (envVar.isArrayElement && envVar.arrayIndex !== undefined) {
    hints.push(`array index: ${envVar.arrayIndex}`)
  }

  if (envVar.originalPath) {
    hints.push(`path: ${envVar.originalPath}`)
  }

  return hints.length > 0 ? `# ${hints.join(', ')}` : ''
}

/**
 * Validates that environment variable names are valid
 * @param envVars Array of environment variables
 * @returns Validation warnings
 */
export function validateEnvironmentVariableNames(envVars: EnvironmentVariable[]): string[] {
  const warnings: string[] = []
  const seen = new Set<string>()

  envVars.forEach((envVar) => {
    // Check for duplicates
    if (seen.has(envVar.key)) {
      warnings.push(`Duplicate environment variable key: ${envVar.key}`)
    }
    seen.add(envVar.key)

    // Check for invalid characters (this should be caught earlier, but double-check)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(envVar.key)) {
      warnings.push(`Invalid environment variable name: ${envVar.key}`)
    }

    // Check for extremely long names
    if (envVar.key.length > 255) {
      warnings.push(`Environment variable name too long (${envVar.key.length} chars): ${envVar.key}`)
    }

    // Check for extremely long values
    if (envVar.value.length > 32767) {
      warnings.push(`Environment variable value too long (${envVar.value.length} chars) for key: ${envVar.key}`)
    }
  })

  return warnings
}

/**
 * Creates a complete conversion result with formatted output
 * @param envVars Array of environment variables
 * @param format Output format
 * @param formatOptions Format options
 * @param existingWarnings Existing warnings from conversion
 * @returns Complete ConversionResult
 */
export function createFormattedResult(
  envVars: EnvironmentVariable[],
  format: OutputFormat,
  formatOptions: FormatOptions,
  existingWarnings: string[] = []
): ConversionResult {
  try {
    const validationWarnings = validateEnvironmentVariableNames(envVars)
    const allWarnings = [...existingWarnings, ...validationWarnings]
    
    const formattedOutput = formatOutput(envVars, format, formatOptions)

    return {
      success: true,
      environmentVariables: envVars,
      formattedOutput,
      warnings: allWarnings,
    }
  } catch (error) {
    return {
      success: false,
      environmentVariables: envVars,
      formattedOutput: '',
      warnings: existingWarnings,
      error: (error as Error).message,
    }
  }
}

/**
 * Estimates the output size for different formats
 * @param envVars Array of environment variables
 * @returns Size estimates for each format
 */
export function estimateOutputSizes(envVars: EnvironmentVariable[]): {
  dockerCompose: number
  envFile: number
  plainText: number
} {
  const dockerCompose = formatDockerCompose(envVars, { useArrayFormat: true, indentLevel: 2 }).length
  const envFile = formatEnvFile(envVars, { includeComments: true, quoteValues: true }).length
  const plainText = formatPlainText(envVars, { separator: '=', includeExport: false }).length

  return {
    dockerCompose,
    envFile,
    plainText,
  }
}