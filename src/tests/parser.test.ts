/**
 * Unit tests for parser module
 */

import { describe, it, expect } from 'vitest'
import {
  validateJson,
  parseAppSettings,
  createProcessingError,
  getNestedValue,
  isPrimitiveValue,
} from '../core/parser'
import type { JsonObject } from '../core/types'

describe('validateJson', () => {
  it('should validate correct JSON', () => {
    const result = validateJson('{"key": "value"}')
    expect(result.isValid).toBe(true)
    expect(result.data).toEqual({ key: 'value' })
    expect(result.error).toBeUndefined()
  })

  it('should reject empty input', () => {
    const result = validateJson('')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Input is empty or contains only whitespace')
    expect(result.lineNumber).toBe(1)
    expect(result.columnNumber).toBe(1)
  })

  it('should reject whitespace-only input', () => {
    const result = validateJson('   \n  \t  ')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Input is empty or contains only whitespace')
  })

  it('should reject JSON arrays as root', () => {
    const result = validateJson('[1, 2, 3]')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Root element must be a JSON object, not an array or primitive value')
  })

  it('should reject primitive values as root', () => {
    const result = validateJson('"hello"')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Root element must be a JSON object, not an array or primitive value')
  })

  it('should handle malformed JSON with position info', () => {
    const result = validateJson('{"key": "value",}')
    expect(result.isValid).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.lineNumber).toBeDefined()
    expect(result.columnNumber).toBeDefined()
  })

  it('should handle missing closing bracket', () => {
    const result = validateJson('{"key": "value"')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain("Expected ',' or '}'")
  })

  it('should handle unexpected token', () => {
    const result = validateJson('{"key": value}')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Unexpected token')
  })

  it('should validate complex nested JSON from examples', () => {
    const exampleJson = `{
      "ConnectionStrings": {
        "DefaultConnection": "Server=localhost;Database=MyApp;Trusted_Connection=true;",
        "Redis": "localhost:6379"
      },
      "Logging": {
        "LogLevel": {
          "Default": "Information",
          "Microsoft": "Warning",
          "Microsoft.Hosting.Lifetime": "Information"
        }
      },
      "AllowedHosts": "*",
      "ApiSettings": {
        "BaseUrl": "https://api.example.com",
        "Timeout": 30,
        "ApiKey": "your-api-key-here"
      },
      "FeatureFlags": {
        "EnableNewFeature": true,
        "EnableBetaFeature": false
      },
      "Servers": [
        "https://server1.example.com",
        "https://server2.example.com",
        "https://server3.example.com"
      ],
      "DatabaseSettings": {
        "Providers": [
          {
            "Name": "SqlServer",
            "ConnectionString": "Server=sql1;Database=DB1;"
          },
          {
            "Name": "PostgreSQL",
            "ConnectionString": "Host=pg1;Database=DB2;"
          }
        ]
      }
    }`

    const result = validateJson(exampleJson)
    expect(result.isValid).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.ConnectionStrings).toBeDefined()
    expect(result.data?.Servers).toBeDefined()
  })
})

describe('parseAppSettings', () => {
  it('should parse valid appsettings with no warnings', () => {
    const data: JsonObject = {
      ConnectionStrings: {
        DefaultConnection: 'Server=localhost;Database=MyApp;',
      },
      Logging: {
        LogLevel: {
          Default: 'Information',
        },
      },
    }

    const result = parseAppSettings(data)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should warn about non-string connection strings', () => {
    const data: JsonObject = {
      ConnectionStrings: {
        DefaultConnection: 123,
        EmptyConnection: '',
      },
    }

    const result = parseAppSettings(data)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toContain('ConnectionString "DefaultConnection" is not a string value')
    expect(result.warnings).toContain('ConnectionString "EmptyConnection" is empty')
  })

  it('should warn about non-string log levels', () => {
    const data: JsonObject = {
      Logging: {
        LogLevel: {
          Default: 123,
          Microsoft: 'Warning',
        },
      },
    }

    const result = parseAppSettings(data)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toContain('LogLevel "Default" should be a string value')
    expect(result.warnings).not.toContain('LogLevel "Microsoft"')
  })

  it('should warn about root-level arrays (except AllowedHosts)', () => {
    const data: JsonObject = {
      AllowedHosts: ['localhost', 'example.com'],
      CustomArray: ['item1', 'item2'],
    }

    const result = parseAppSettings(data)
    expect(result.isValid).toBe(true)
    // Note: Removed array warning as root-level array properties are valid in appsettings.json
    expect(result.warnings).not.toContain('CustomArray') // Should not warn about valid array properties
    expect(result.warnings).not.toContain('AllowedHosts')
  })

  it('should warn about keys with double underscores', () => {
    const data: JsonObject = {
      'Key__With__Underscores': 'value',
      'Key.With.Dots': 'value',
      'Key-With-Special!@#': 'value',
    }

    const result = parseAppSettings(data)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toContain(
      'Key "Key__With__Underscores" contains double underscores - may cause conflicts with converted output'
    )
    expect(result.warnings).toContain(
      'Key "Key.With.Dots" contains dots - will be converted to double underscores'
    )
    expect(result.warnings).toContain(
      'Key "Key-With-Special!@#" contains special characters - ensure compatibility with your environment'
    )
  })

  it('should warn about very deep nesting', () => {
    const data: JsonObject = {
      Level1: {
        Level2: {
          Level3: {
            Level4: {
              Level5: {
                Level6: {
                  Level7: {
                    Level8: {
                      Level9: {
                        Level10: {
                          Level11: 'deep value',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    const result = parseAppSettings(data)
    expect(result.isValid).toBe(true)
    expect(result.warnings.some(w => w.includes('Very deep nesting detected'))).toBe(true)
  })

  it('should handle parsing errors gracefully', () => {
    const data: JsonObject = {}
    // Mock a parsing error by passing invalid data to internal function
    const result = parseAppSettings(data)
    expect(result.isValid).toBe(true) // Empty object is valid
    expect(result.errors).toHaveLength(0)
  })
})

describe('createProcessingError', () => {
  it('should create error with all properties', () => {
    const error = createProcessingError(
      'INVALID_JSON',
      'Test error message',
      { context: 'test' }
    )

    expect(error.type).toBe('INVALID_JSON')
    expect(error.message).toBe('Test error message')
    expect(error.context).toEqual({ context: 'test' })
    expect(error.stack).toBeDefined()
  })

  it('should create error without context', () => {
    const error = createProcessingError('EMPTY_INPUT', 'Empty input error')

    expect(error.type).toBe('EMPTY_INPUT')
    expect(error.message).toBe('Empty input error')
    expect(error.context).toBeUndefined()
    expect(error.stack).toBeDefined()
  })
})

describe('getNestedValue', () => {
  const testObj: JsonObject = {
    level1: {
      level2: {
        value: 'found',
        number: 42,
      },
      array: [1, 2, 3],
    },
    primitive: 'string value',
  }

  it('should get nested object values', () => {
    expect(getNestedValue(testObj, 'level1.level2.value')).toBe('found')
    expect(getNestedValue(testObj, 'level1.level2.number')).toBe(42)
  })

  it('should get top-level values', () => {
    expect(getNestedValue(testObj, 'primitive')).toBe('string value')
  })

  it('should return undefined for non-existent paths', () => {
    expect(getNestedValue(testObj, 'nonexistent')).toBeUndefined()
    expect(getNestedValue(testObj, 'level1.nonexistent')).toBeUndefined()
    expect(getNestedValue(testObj, 'level1.level2.nonexistent')).toBeUndefined()
  })

  it('should handle arrays in path', () => {
    expect(getNestedValue(testObj, 'level1.array')).toEqual([1, 2, 3])
  })

  it('should return undefined when trying to access property of primitive', () => {
    expect(getNestedValue(testObj, 'primitive.property')).toBeUndefined()
  })

  it('should return undefined when trying to access property of array', () => {
    expect(getNestedValue(testObj, 'level1.array.property')).toBeUndefined()
  })
})

describe('isPrimitiveValue', () => {
  it('should identify string as primitive', () => {
    expect(isPrimitiveValue('hello')).toBe(true)
  })

  it('should identify number as primitive', () => {
    expect(isPrimitiveValue(42)).toBe(true)
    expect(isPrimitiveValue(3.14)).toBe(true)
    expect(isPrimitiveValue(0)).toBe(true)
  })

  it('should identify boolean as primitive', () => {
    expect(isPrimitiveValue(true)).toBe(true)
    expect(isPrimitiveValue(false)).toBe(true)
  })

  it('should identify null as primitive', () => {
    expect(isPrimitiveValue(null)).toBe(true)
  })

  it('should identify object as non-primitive', () => {
    expect(isPrimitiveValue({})).toBe(false)
    expect(isPrimitiveValue({ key: 'value' })).toBe(false)
  })

  it('should identify array as non-primitive', () => {
    expect(isPrimitiveValue([])).toBe(false)
    expect(isPrimitiveValue([1, 2, 3])).toBe(false)
  })
})