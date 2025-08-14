/**
 * Unit tests for formatter module
 */

import { describe, it, expect } from 'vitest'
import {
  formatOutput,
  validateEnvironmentVariableNames,
  createFormattedResult,
  estimateOutputSizes,
} from '../core/formatter'
import type { 
  EnvironmentVariable, 
  OutputFormat, 
  FormatOptions
} from '../core/types'

// Test data based on converts-examples.md
const createTestEnvironmentVariables = (): EnvironmentVariable[] => [
  {
    key: 'ConnectionStrings__DefaultConnection',
    value: 'Server=localhost;Database=MyApp;Trusted_Connection=true;',
    originalPath: 'ConnectionStrings.DefaultConnection',
    originalType: 'string',
    isArrayElement: false,
  },
  {
    key: 'ConnectionStrings__Redis',
    value: 'localhost:6379',
    originalPath: 'ConnectionStrings.Redis',
    originalType: 'string',
    isArrayElement: false,
  },
  {
    key: 'Logging__LogLevel__Default',
    value: 'Information',
    originalPath: 'Logging.LogLevel.Default',
    originalType: 'string',
    isArrayElement: false,
  },
  {
    key: 'AllowedHosts',
    value: '*',
    originalPath: 'AllowedHosts',
    originalType: 'string',
    isArrayElement: false,
  },
  {
    key: 'ApiSettings__Timeout',
    value: '30',
    originalPath: 'ApiSettings.Timeout',
    originalType: 'number',
    isArrayElement: false,
  },
  {
    key: 'FeatureFlags__EnableNewFeature',
    value: 'true',
    originalPath: 'FeatureFlags.EnableNewFeature',
    originalType: 'boolean',
    isArrayElement: false,
  },
  {
    key: 'FeatureFlags__EnableBetaFeature',
    value: 'false',
    originalPath: 'FeatureFlags.EnableBetaFeature',
    originalType: 'boolean',
    isArrayElement: false,
  },
  {
    key: 'Servers__0',
    value: 'https://server1.example.com',
    originalPath: 'Servers[0]',
    originalType: 'string',
    isArrayElement: true,
    arrayIndex: 0,
  },
  {
    key: 'Servers__1',
    value: 'https://server2.example.com',
    originalPath: 'Servers[1]',
    originalType: 'string',
    isArrayElement: true,
    arrayIndex: 1,
  },
  {
    key: 'DatabaseSettings__Providers__0__Name',
    value: 'SqlServer',
    originalPath: 'DatabaseSettings.Providers[0].Name',
    originalType: 'string',
    isArrayElement: true,
    arrayIndex: 0,
  }
]

const defaultFormatOptions: FormatOptions = {
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

describe('formatOutput', () => {
  const testVars = createTestEnvironmentVariables()

  describe('docker-compose format', () => {
    it('should format as array format', () => {
      const result = formatOutput(testVars, 'docker-compose', defaultFormatOptions)
      
      expect(result).toContain('environment:')
      expect(result).toContain('  - ConnectionStrings__DefaultConnection=Server=localhost;Database=MyApp;Trusted_Connection=true;')
      expect(result).toContain('  - ConnectionStrings__Redis="localhost:6379"')
      expect(result).toContain('  - AllowedHosts="*"')
      expect(result).toContain('  - ApiSettings__Timeout="30"')
      expect(result).toContain('  - FeatureFlags__EnableNewFeature="true"')
      expect(result).toContain('  - Servers__0="https://server1.example.com"')
      
      // Check that all lines start with proper indentation
      const lines = result.split('\n').filter(line => line.trim() !== '')
      lines.slice(1).forEach(line => {
        expect(line).toMatch(/^ {2}- \w/)
      })
    })

    it('should format as object format', () => {
      const options = {
        ...defaultFormatOptions,
        dockerCompose: { useArrayFormat: false, indentLevel: 2 }
      }
      
      const result = formatOutput(testVars, 'docker-compose', options)
      
      expect(result).toContain('environment:')
      expect(result).toContain('  ConnectionStrings__DefaultConnection: Server=localhost;Database=MyApp;Trusted_Connection=true;')
      expect(result).toContain('  AllowedHosts: "*"')
      expect(result).not.toContain('  - ')
    })

    it('should handle custom indentation', () => {
      const options = {
        ...defaultFormatOptions,
        dockerCompose: { useArrayFormat: true, indentLevel: 4 }
      }
      
      const result = formatOutput(testVars, 'docker-compose', options)
      
      const lines = result.split('\n')
      lines.slice(1).forEach(line => {
        if (line.trim()) {
          expect(line).toMatch(/^ {4}- /)
        }
      })
    })

    it('should escape YAML values correctly', () => {
      const specialVars: EnvironmentVariable[] = [
        {
          key: 'QUOTE_VALUE',
          value: 'value with "quotes"',
          originalPath: 'QuoteValue',
          originalType: 'string',
          isArrayElement: false,
        },
        {
          key: 'SPECIAL_CHARS',
          value: 'value: with [special] {chars}',
          originalPath: 'SpecialChars',
          originalType: 'string',
          isArrayElement: false,
        },
        {
          key: 'BOOLEAN_LIKE',
          value: 'true',
          originalPath: 'BooleanLike',
          originalType: 'string',
          isArrayElement: false,
        },
        {
          key: 'EMPTY_VALUE',
          value: '',
          originalPath: 'EmptyValue',
          originalType: 'string',
          isArrayElement: false,
        }
      ]

      const result = formatOutput(specialVars, 'docker-compose', defaultFormatOptions)
      
      expect(result).toContain('QUOTE_VALUE="value with \\"quotes\\""')
      expect(result).toContain('SPECIAL_CHARS="value: with [special] {chars}"')
      expect(result).toContain('BOOLEAN_LIKE="true"') // Should be quoted as it looks like boolean
      expect(result).toContain('EMPTY_VALUE=""')
    })
  })

  describe('env-file format', () => {
    it('should format with comments', () => {
      const result = formatOutput(testVars, 'env-file', defaultFormatOptions)
      
      expect(result).toContain('# Generated from appsettings.json')
      expect(result).toContain('# ConnectionStrings configuration')
      expect(result).toContain('ConnectionStrings__DefaultConnection="Server=localhost;Database=MyApp;Trusted_Connection=true;"')
      expect(result).toContain('# Original type: number')
      expect(result).toContain('ApiSettings__Timeout="30"')
    })

    it('should format without comments', () => {
      const options = {
        ...defaultFormatOptions,
        envFile: { includeComments: false, quoteValues: true }
      }
      
      const result = formatOutput(testVars, 'env-file', options)
      
      expect(result).not.toContain('# Generated from appsettings.json')
      expect(result).not.toContain('# Original type:')
      expect(result).toContain('ConnectionStrings__DefaultConnection="Server=localhost;Database=MyApp;Trusted_Connection=true;"')
    })

    it('should format without quotes when disabled', () => {
      const options = {
        ...defaultFormatOptions,
        envFile: { includeComments: false, quoteValues: false }
      }
      
      const result = formatOutput(testVars, 'env-file', options)
      
      expect(result).toContain('AllowedHosts=*')
      expect(result).toContain('ApiSettings__Timeout=30')
      expect(result).not.toContain('"')
    })

    it('should group variables by section', () => {
      const result = formatOutput(testVars, 'env-file', defaultFormatOptions)
      
      const lines = result.split('\n')
      const connectionStringsIndex = lines.findIndex(line => line.includes('# ConnectionStrings configuration'))
      const loggingIndex = lines.findIndex(line => line.includes('# Logging configuration'))
      const apiSettingsIndex = lines.findIndex(line => line.includes('# ApiSettings configuration'))
      
      expect(connectionStringsIndex).toBeGreaterThan(-1)
      expect(loggingIndex).toBeGreaterThan(connectionStringsIndex)
      expect(apiSettingsIndex).toBeGreaterThan(loggingIndex)
    })

    it('should handle special characters in values', () => {
      const specialVars: EnvironmentVariable[] = [
        {
          key: 'BACKSLASH_VALUE',
          value: 'path\\to\\file',
          originalPath: 'BackslashValue',
          originalType: 'string',
          isArrayElement: false,
        },
        {
          key: 'NEWLINE_VALUE',
          value: 'line1\nline2',
          originalPath: 'NewlineValue',
          originalType: 'string',
          isArrayElement: false,
        },
        {
          key: 'QUOTE_VALUE',
          value: 'say "hello"',
          originalPath: 'QuoteValue',
          originalType: 'string',
          isArrayElement: false,
        }
      ]

      const result = formatOutput(specialVars, 'env-file', defaultFormatOptions)
      
      expect(result).toContain('BACKSLASH_VALUE="path\\\\to\\\\file"')
      expect(result).toContain('NEWLINE_VALUE="line1\\nline2"')
      expect(result).toContain('QUOTE_VALUE="say \\"hello\\""')
    })
  })

  describe('plain-text format', () => {
    it('should format as plain text', () => {
      const result = formatOutput(testVars, 'plain-text', defaultFormatOptions)
      
      expect(result).toContain("ConnectionStrings__DefaultConnection='Server=localhost;Database=MyApp;Trusted_Connection=true;'")
      expect(result).toContain("AllowedHosts='*'") // Simple values get quoted in shell
      expect(result).toContain('ApiSettings__Timeout=30')
      expect(result).not.toContain('export ')
    })

    it('should format with export statements', () => {
      const options = {
        ...defaultFormatOptions,
        plainText: { separator: '=', includeExport: true }
      }
      
      const result = formatOutput(testVars, 'plain-text', options)
      
      expect(result).toContain("export ConnectionStrings__DefaultConnection='Server=localhost;Database=MyApp;Trusted_Connection=true;'")
      expect(result).toContain("export AllowedHosts='*'")
    })

    it('should use custom separator', () => {
      const options = {
        ...defaultFormatOptions,
        plainText: { separator: ': ', includeExport: false }
      }
      
      const result = formatOutput(testVars, 'plain-text', options)
      
      expect(result).toContain("AllowedHosts: '*'")
      expect(result).toContain('ApiSettings__Timeout: 30')
    })

    it('should handle shell escaping correctly', () => {
      const specialVars: EnvironmentVariable[] = [
        {
          key: 'SIMPLE_VALUE',
          value: 'simple123',
          originalPath: 'SimpleValue',
          originalType: 'string',
          isArrayElement: false,
        },
        {
          key: 'SPACE_VALUE',
          value: 'value with spaces',
          originalPath: 'SpaceValue',
          originalType: 'string',
          isArrayElement: false,
        },
        {
          key: 'QUOTE_VALUE',
          value: "value with 'quotes'",
          originalPath: 'QuoteValue',
          originalType: 'string',
          isArrayElement: false,
        },
        {
          key: 'EMPTY_VALUE',
          value: '',
          originalPath: 'EmptyValue',
          originalType: 'string',
          isArrayElement: false,
        }
      ]

      const result = formatOutput(specialVars, 'plain-text', defaultFormatOptions)
      
      expect(result).toContain('SIMPLE_VALUE=simple123') // No quotes needed
      expect(result).toContain("SPACE_VALUE='value with spaces'")
      expect(result).toContain("QUOTE_VALUE='value with '\"'\"'quotes'\"'\"''") // Escaped single quotes
      expect(result).toContain("EMPTY_VALUE=''")
    })
  })

  it('should throw error for unsupported format', () => {
    expect(() => {
      formatOutput(testVars, 'unsupported' as OutputFormat, defaultFormatOptions)
    }).toThrow('Unsupported output format: unsupported')
  })
})

describe('validateEnvironmentVariableNames', () => {
  it('should return no warnings for valid names', () => {
    const validVars: EnvironmentVariable[] = [
      {
        key: 'VALID_NAME',
        value: 'value',
        originalPath: 'ValidName',
        originalType: 'string',
        isArrayElement: false,
      },
      {
        key: 'another_valid_name',
        value: 'value',
        originalPath: 'AnotherValidName',
        originalType: 'string',
        isArrayElement: false,
      }
    ]

    const warnings = validateEnvironmentVariableNames(validVars)
    expect(warnings).toHaveLength(0)
  })

  it('should warn about duplicate keys', () => {
    const duplicateVars: EnvironmentVariable[] = [
      {
        key: 'DUPLICATE_KEY',
        value: 'value1',
        originalPath: 'DuplicateKey1',
        originalType: 'string',
        isArrayElement: false,
      },
      {
        key: 'DUPLICATE_KEY',
        value: 'value2',
        originalPath: 'DuplicateKey2',
        originalType: 'string',
        isArrayElement: false,
      }
    ]

    const warnings = validateEnvironmentVariableNames(duplicateVars)
    expect(warnings).toContain('Duplicate environment variable key: DUPLICATE_KEY')
  })

  it('should warn about invalid characters', () => {
    const invalidVars: EnvironmentVariable[] = [
      {
        key: 'INVALID-KEY',
        value: 'value',
        originalPath: 'InvalidKey',
        originalType: 'string',
        isArrayElement: false,
      },
      {
        key: 'INVALID.KEY',
        value: 'value',
        originalPath: 'InvalidKey2',
        originalType: 'string',
        isArrayElement: false,
      }
    ]

    const warnings = validateEnvironmentVariableNames(invalidVars)
    expect(warnings).toContain('Invalid environment variable name: INVALID-KEY')
    expect(warnings).toContain('Invalid environment variable name: INVALID.KEY')
  })

  it('should warn about extremely long names', () => {
    const longKey = 'A'.repeat(256)
    const longVars: EnvironmentVariable[] = [
      {
        key: longKey,
        value: 'value',
        originalPath: 'LongKey',
        originalType: 'string',
        isArrayElement: false,
      }
    ]

    const warnings = validateEnvironmentVariableNames(longVars)
    expect(warnings).toContain(`Environment variable name too long (256 chars): ${longKey}`)
  })

  it('should warn about extremely long values', () => {
    const longValue = 'A'.repeat(32768)
    const longVars: EnvironmentVariable[] = [
      {
        key: 'VALID_KEY',
        value: longValue,
        originalPath: 'ValidKey',
        originalType: 'string',
        isArrayElement: false,
      }
    ]

    const warnings = validateEnvironmentVariableNames(longVars)
    expect(warnings).toContain('Environment variable value too long (32768 chars) for key: VALID_KEY')
  })
})

describe('createFormattedResult', () => {
  const testVars = createTestEnvironmentVariables()

  it('should create successful result', () => {
    const result = createFormattedResult(testVars, 'docker-compose', defaultFormatOptions)
    
    expect(result.success).toBe(true)
    expect(result.environmentVariables).toBe(testVars)
    expect(result.formattedOutput).toContain('environment:')
    expect(result.warnings).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it('should include existing warnings', () => {
    const existingWarnings = ['Existing warning 1', 'Existing warning 2']
    const result = createFormattedResult(testVars, 'docker-compose', defaultFormatOptions, existingWarnings)
    
    expect(result.success).toBe(true)
    expect(result.warnings).toContain('Existing warning 1')
    expect(result.warnings).toContain('Existing warning 2')
  })

  it('should handle formatting errors', () => {
    // Create a scenario that would cause formatting to fail
    const invalidVars: EnvironmentVariable[] = [
      {
        key: 'INVALID-KEY',
        value: 'value',
        originalPath: 'InvalidKey',
        originalType: 'string',
        isArrayElement: false,
      }
    ]

    const result = createFormattedResult(invalidVars, 'docker-compose', defaultFormatOptions)
    
    // Should still succeed but include warnings about invalid key
    expect(result.success).toBe(true)
    expect(result.warnings).toContain('Invalid environment variable name: INVALID-KEY')
  })

  it('should handle unsupported format gracefully', () => {
    const result = createFormattedResult(testVars, 'unsupported' as OutputFormat, defaultFormatOptions)
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unsupported output format')
  })
})

describe('estimateOutputSizes', () => {
  const testVars = createTestEnvironmentVariables()

  it('should estimate sizes for all formats', () => {
    const sizes = estimateOutputSizes(testVars)
    
    expect(sizes.dockerCompose).toBeGreaterThan(0)
    expect(sizes.envFile).toBeGreaterThan(0)
    expect(sizes.plainText).toBeGreaterThan(0)
    
    // Generally env file should be largest due to comments
    expect(sizes.envFile).toBeGreaterThan(sizes.plainText)
  })

  it('should provide accurate size estimates', () => {
    const singleVar: EnvironmentVariable[] = [
      {
        key: 'TEST_KEY',
        value: 'test_value',
        originalPath: 'TestKey',
        originalType: 'string',
        isArrayElement: false,
      }
    ]

    const sizes = estimateOutputSizes(singleVar)
    
    // Verify sizes match actual formatted output lengths
    const dockerComposeOutput = formatOutput(singleVar, 'docker-compose', defaultFormatOptions)
    const envFileOutput = formatOutput(singleVar, 'env-file', defaultFormatOptions)
    const plainTextOutput = formatOutput(singleVar, 'plain-text', defaultFormatOptions)
    
    expect(sizes.dockerCompose).toBe(dockerComposeOutput.length)
    expect(sizes.envFile).toBe(envFileOutput.length)
    expect(sizes.plainText).toBe(plainTextOutput.length)
  })

  it('should handle empty variable list', () => {
    const sizes = estimateOutputSizes([])
    
    expect(sizes.dockerCompose).toBeGreaterThan(0) // Should at least contain 'environment:'
    expect(sizes.envFile).toBeGreaterThan(0) // Should contain header comments
    expect(sizes.plainText).toBe(0) // Should be empty
  })
})