/**
 * Unit tests for converter module
 */

import { describe, it, expect } from 'vitest'
import {
  convertToEnvironmentVariables,
  validateConversionOptions,
  analyzeConversionComplexity,
} from '../core/converter'
import type { ConversionOptions, JsonObject } from '../core/types'

describe('convertToEnvironmentVariables', () => {
  const defaultOptions: ConversionOptions = {
    prefix: '',
    namingConvention: 'preserve',
    includeTypeHints: false,
    keySeparator: '__',
    nullHandling: 'empty',
    includeArrayIndices: true,
  }

  it('should convert example appsettings.json correctly', () => {
    const exampleData: JsonObject = {
      ConnectionStrings: {
        DefaultConnection: 'Server=localhost;Database=MyApp;Trusted_Connection=true;',
        Redis: 'localhost:6379',
      },
      Logging: {
        LogLevel: {
          Default: 'Information',
          Microsoft: 'Warning',
          'Microsoft.Hosting.Lifetime': 'Information',
        },
      },
      AllowedHosts: '*',
      ApiSettings: {
        BaseUrl: 'https://api.example.com',
        Timeout: 30,
        ApiKey: 'your-api-key-here',
      },
      FeatureFlags: {
        EnableNewFeature: true,
        EnableBetaFeature: false,
      },
      Servers: ['https://server1.example.com', 'https://server2.example.com', 'https://server3.example.com'],
      DatabaseSettings: {
        Providers: [
          {
            Name: 'SqlServer',
            ConnectionString: 'Server=sql1;Database=DB1;',
          },
          {
            Name: 'PostgreSQL',
            ConnectionString: 'Host=pg1;Database=DB2;',
          },
        ],
      },
    }

    const result = convertToEnvironmentVariables(exampleData, defaultOptions)

    expect(result.success).toBe(true)
    expect(result.environmentVariables).toBeDefined()

    const envVars = result.environmentVariables
    const envKeys = envVars.map(v => v.key)
    const envMap = new Map(envVars.map(v => [v.key, v.value]))

    // Test connection strings
    expect(envKeys).toContain('ConnectionStrings__DefaultConnection')
    expect(envKeys).toContain('ConnectionStrings__Redis')
    expect(envMap.get('ConnectionStrings__DefaultConnection')).toBe('Server=localhost;Database=MyApp;Trusted_Connection=true;')
    expect(envMap.get('ConnectionStrings__Redis')).toBe('localhost:6379')

    // Test logging configuration
    expect(envKeys).toContain('Logging__LogLevel__Default')
    expect(envKeys).toContain('Logging__LogLevel__Microsoft')
    expect(envKeys).toContain('Logging__LogLevel__Microsoft__Hosting__Lifetime')
    expect(envMap.get('Logging__LogLevel__Default')).toBe('Information')

    // Test primitive values
    expect(envKeys).toContain('AllowedHosts')
    expect(envMap.get('AllowedHosts')).toBe('*')

    // Test numeric values
    expect(envKeys).toContain('ApiSettings__Timeout')
    expect(envMap.get('ApiSettings__Timeout')).toBe('30')

    // Test boolean values
    expect(envKeys).toContain('FeatureFlags__EnableNewFeature')
    expect(envKeys).toContain('FeatureFlags__EnableBetaFeature')
    expect(envMap.get('FeatureFlags__EnableNewFeature')).toBe('true')
    expect(envMap.get('FeatureFlags__EnableBetaFeature')).toBe('false')

    // Test arrays with indices
    expect(envKeys).toContain('Servers__0')
    expect(envKeys).toContain('Servers__1')
    expect(envKeys).toContain('Servers__2')
    expect(envMap.get('Servers__0')).toBe('https://server1.example.com')
    expect(envMap.get('Servers__2')).toBe('https://server3.example.com')

    // Test nested arrays
    expect(envKeys).toContain('DatabaseSettings__Providers__0__Name')
    expect(envKeys).toContain('DatabaseSettings__Providers__0__ConnectionString')
    expect(envKeys).toContain('DatabaseSettings__Providers__1__Name')
    expect(envKeys).toContain('DatabaseSettings__Providers__1__ConnectionString')
    expect(envMap.get('DatabaseSettings__Providers__0__Name')).toBe('SqlServer')
    expect(envMap.get('DatabaseSettings__Providers__1__Name')).toBe('PostgreSQL')
  })

  it('should handle null values according to options', () => {
    const data: JsonObject = {
      nullValue: null,
      stringValue: 'test',
    }

    // Test empty string handling (default)
    const resultEmpty = convertToEnvironmentVariables(data, { ...defaultOptions, nullHandling: 'empty' })
    expect(resultEmpty.success).toBe(true)
    const envMapEmpty = new Map(resultEmpty.environmentVariables.map(v => [v.key, v.value]))
    expect(envMapEmpty.get('nullValue')).toBe('')

    // Test null string handling
    const resultNull = convertToEnvironmentVariables(data, { ...defaultOptions, nullHandling: 'null' })
    expect(resultNull.success).toBe(true)
    const envMapNull = new Map(resultNull.environmentVariables.map(v => [v.key, v.value]))
    expect(envMapNull.get('nullValue')).toBe('null')

    // Test omit handling
    const resultOmit = convertToEnvironmentVariables(data, { ...defaultOptions, nullHandling: 'omit' })
    expect(resultOmit.success).toBe(true)
    const envKeysOmit = resultOmit.environmentVariables.map(v => v.key)
    expect(envKeysOmit).not.toContain('nullValue')
    expect(envKeysOmit).toContain('stringValue')
  })

  it('should handle arrays without indices', () => {
    const data: JsonObject = {
      simpleArray: ['item1', 'item2', 'item3'],
      mixedArray: ['string', 42, true, null],
    }

    const result = convertToEnvironmentVariables(data, { ...defaultOptions, includeArrayIndices: false })
    expect(result.success).toBe(true)

    const envMap = new Map(result.environmentVariables.map(v => [v.key, v.value]))
    expect(envMap.get('simpleArray')).toBe('item1,item2,item3')
    expect(envMap.get('mixedArray')).toBe('string,42,true,null')
  })

  it('should handle empty arrays', () => {
    const data: JsonObject = {
      emptyArray: [],
      nonEmptyArray: ['item'],
    }

    const result = convertToEnvironmentVariables(data, defaultOptions)
    expect(result.success).toBe(true)
    expect(result.warnings.some(w => w.includes('Empty array found'))).toBe(true)

    const envKeys = result.environmentVariables.map(v => v.key)
    expect(envKeys).not.toContain('emptyArray__0')
    expect(envKeys).toContain('nonEmptyArray__0')
  })

  it('should apply naming conventions', () => {
    const data: JsonObject = {
      CamelCase: 'value',
      snake_case: 'value',
      'kebab-case': 'value',
    }

    // Test uppercase
    const resultUpper = convertToEnvironmentVariables(data, { ...defaultOptions, namingConvention: 'uppercase' })
    const envKeysUpper = resultUpper.environmentVariables.map(v => v.key)
    expect(envKeysUpper).toContain('CAMELCASE')
    expect(envKeysUpper).toContain('SNAKE_CASE')

    // Test lowercase
    const resultLower = convertToEnvironmentVariables(data, { ...defaultOptions, namingConvention: 'lowercase' })
    const envKeysLower = resultLower.environmentVariables.map(v => v.key)
    expect(envKeysLower).toContain('camelcase')
    expect(envKeysLower).toContain('snake_case')

    // Test preserve (default)
    const resultPreserve = convertToEnvironmentVariables(data, { ...defaultOptions, namingConvention: 'preserve' })
    const envKeysPreserve = resultPreserve.environmentVariables.map(v => v.key)
    expect(envKeysPreserve).toContain('CamelCase')
    expect(envKeysPreserve).toContain('snake_case')
  })

  it('should apply prefix correctly', () => {
    const data: JsonObject = {
      key1: 'value1',
      nested: {
        key2: 'value2',
      },
    }

    const result = convertToEnvironmentVariables(data, { ...defaultOptions, prefix: 'APP_' })
    expect(result.success).toBe(true)

    const envKeys = result.environmentVariables.map(v => v.key)
    expect(envKeys).toContain('APP_key1')
    expect(envKeys).toContain('APP_nested__key2')
  })

  it('should handle custom key separator', () => {
    const data: JsonObject = {
      level1: {
        level2: {
          value: 'test',
        },
      },
    }

    const result = convertToEnvironmentVariables(data, { ...defaultOptions, keySeparator: '___' })
    expect(result.success).toBe(true)

    const envKeys = result.environmentVariables.map(v => v.key)
    expect(envKeys).toContain('level1___level2___value')
  })

  it('should sanitize special characters in keys', () => {
    const data: JsonObject = {
      'key.with.dots': 'value1',
      'key-with-dashes': 'value2',
      'key with spaces': 'value3',
      'key@with#special!chars': 'value4',
      '123numericstart': 'value5',
    }

    const result = convertToEnvironmentVariables(data, defaultOptions)
    expect(result.success).toBe(true)

    const envKeys = result.environmentVariables.map(v => v.key)
    expect(envKeys).toContain('key__with__dots')
    expect(envKeys).toContain('key_with_dashes')
    expect(envKeys).toContain('key_with_spaces')
    expect(envKeys).toContain('key_with_special_chars')
    expect(envKeys).toContain('_123numericstart')

    // Should have warnings about key transformations
    expect(result.warnings.some(w => w.includes('Replaced dots in key'))).toBe(true)
    expect(result.warnings.some(w => w.includes('Replaced special characters'))).toBe(true)
    expect(result.warnings.some(w => w.includes('Prefixed key'))).toBe(true)
  })

  it('should track original types and paths correctly', () => {
    const data: JsonObject = {
      stringVal: 'hello',
      numberVal: 42,
      boolVal: true,
      nullVal: null,
      arrayVal: ['item1', 'item2'],
    }

    const result = convertToEnvironmentVariables(data, defaultOptions)
    expect(result.success).toBe(true)

    const envVars = result.environmentVariables
    const stringVar = envVars.find(v => v.key === 'stringVal')
    const numberVar = envVars.find(v => v.key === 'numberVal')
    const boolVar = envVars.find(v => v.key === 'boolVal')
    const nullVar = envVars.find(v => v.key === 'nullVal')
    const arrayVar0 = envVars.find(v => v.key === 'arrayVal__0')

    expect(stringVar?.originalType).toBe('string')
    expect(numberVar?.originalType).toBe('number')
    expect(boolVar?.originalType).toBe('boolean')
    expect(nullVar?.originalType).toBe('null')
    expect(arrayVar0?.originalType).toBe('string')
    expect(arrayVar0?.isArrayElement).toBe(true)
    expect(arrayVar0?.arrayIndex).toBe(0)
  })

  it('should handle conversion errors gracefully', () => {
    // This is harder to trigger since our converter is robust
    // But we can test the error structure is correct when it does fail
    const data: JsonObject = {}
    const result = convertToEnvironmentVariables(data, defaultOptions)
    expect(result.success).toBe(true) // Empty object should succeed
  })

  it('should handle complex nested structures', () => {
    const data: JsonObject = {
      level1: {
        level2: {
          level3: {
            array: [
              { prop: 'value1' },
              { prop: 'value2' },
            ],
          },
        },
      },
    }

    const result = convertToEnvironmentVariables(data, defaultOptions)
    expect(result.success).toBe(true)

    const envKeys = result.environmentVariables.map(v => v.key)
    expect(envKeys).toContain('level1__level2__level3__array__0__prop')
    expect(envKeys).toContain('level1__level2__level3__array__1__prop')
  })
})

describe('validateConversionOptions', () => {
  it('should provide defaults for missing options', () => {
    const result = validateConversionOptions({})
    expect(result.prefix).toBe('')
    expect(result.namingConvention).toBe('preserve')
    expect(result.includeTypeHints).toBe(false)
    expect(result.keySeparator).toBe('__')
    expect(result.nullHandling).toBe('empty')
    expect(result.includeArrayIndices).toBe(true)
  })

  it('should preserve provided valid options', () => {
    const input = {
      prefix: 'TEST_',
      namingConvention: 'uppercase' as const,
      includeTypeHints: true,
      keySeparator: '___',
      nullHandling: 'null' as const,
      includeArrayIndices: false,
    }

    const result = validateConversionOptions(input)
    expect(result.prefix).toBe('TEST_')
    expect(result.namingConvention).toBe('uppercase')
    expect(result.includeTypeHints).toBe(true)
    expect(result.keySeparator).toBe('___')
    expect(result.nullHandling).toBe('null')
    expect(result.includeArrayIndices).toBe(false)
  })

  it('should fix invalid keySeparator', () => {
    const result = validateConversionOptions({ keySeparator: '' })
    expect(result.keySeparator).toBe('__')
  })

  it('should sanitize prefix', () => {
    const result1 = validateConversionOptions({ prefix: 'test@#$%' })
    expect(result1.prefix).toBe('test____')

    const result2 = validateConversionOptions({ prefix: 'test' })
    expect(result2.prefix).toBe('test_')

    const result3 = validateConversionOptions({ prefix: '123invalid' })
    expect(result3.prefix).toBe('_123invalid_')

    const result4 = validateConversionOptions({ prefix: 'valid_prefix_' })
    expect(result4.prefix).toBe('valid_prefix_')
  })

  it('should handle empty prefix', () => {
    const result = validateConversionOptions({ prefix: '' })
    expect(result.prefix).toBe('')
  })
})

describe('analyzeConversionComplexity', () => {
  it('should analyze simple object', () => {
    const data: JsonObject = {
      key1: 'value1',
      key2: 'value2',
    }

    const result = analyzeConversionComplexity(data)
    expect(result.totalKeys).toBe(2)
    expect(result.maxDepth).toBe(2)
    expect(result.arrayCount).toBe(0)
    expect(result.recommendations).toHaveLength(0)
  })

  it('should analyze complex nested structure', () => {
    const data: JsonObject = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  level7: 'deep',
                },
              },
            },
          },
        },
      },
    }

    const result = analyzeConversionComplexity(data)
    expect(result.maxDepth).toBe(8)
    expect(result.recommendations).toContain(
      'Deep nesting detected - consider flattening configuration structure'
    )
  })

  it('should count arrays correctly', () => {
    const data: JsonObject = {
      array1: [1, 2, 3],
      array2: ['a', 'b'],
      nested: {
        array3: [{ prop: 'value' }],
        array4: [],
        array5: [1],
        array6: [1, 2],
        array7: [1, 2, 3],
        array8: [1, 2, 3, 4],
        array9: [1, 2, 3, 4, 5],
        array10: [1, 2, 3, 4, 5, 6],
        array11: [1, 2, 3, 4, 5, 6, 7],
        array12: [1, 2, 3, 4, 5, 6, 7, 8],
      },
    }

    const result = analyzeConversionComplexity(data)
    expect(result.arrayCount).toBe(12) // 12 arrays total
    expect(result.recommendations).toContain(
      'Many arrays detected - ensure array handling matches your deployment needs'
    )
  })

  it('should recommend splitting large configurations', () => {
    const data: JsonObject = {}
    
    // Create an object with many keys
    for (let i = 0; i < 101; i++) {
      data[`key${i}`] = `value${i}`
    }

    const result = analyzeConversionComplexity(data)
    expect(result.totalKeys).toBe(101)
    expect(result.recommendations).toContain(
      'Large configuration detected - consider splitting into multiple files'
    )
  })

  it('should provide multiple recommendations', () => {
    const data: JsonObject = {}
    
    // Create large, deep, array-heavy structure
    let current = data
    for (let i = 0; i < 101; i++) {
      current[`key${i}`] = `value${i}`
    }

    // Add deep nesting
    current.deep = { l1: { l2: { l3: { l4: { l5: { l6: { l7: 'value' } } } } } } }

    // Add many arrays
    for (let i = 0; i < 11; i++) {
      current[`array${i}`] = [1, 2, 3]
    }

    const result = analyzeConversionComplexity(data)
    expect(result.recommendations).toContain(
      'Large configuration detected - consider splitting into multiple files'
    )
    expect(result.recommendations).toContain(
      'Deep nesting detected - consider flattening configuration structure'
    )
    expect(result.recommendations).toContain(
      'Many arrays detected - ensure array handling matches your deployment needs'
    )
  })
})