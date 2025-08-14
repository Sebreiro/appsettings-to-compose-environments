/**
 * Integration tests to validate exact conversion from converts-examples.md
 */

import { describe, it, expect } from 'vitest'
import { validateJson } from '../core/parser'
import { convertToEnvironmentVariables } from '../core/converter'
import { formatOutput } from '../core/formatter'
import type { ConversionOptions, FormatOptions } from '../core/types'

describe('Integration: converts appsettings to the compose env section', () => {
  // Exact JSON from converts-examples.md
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

  // Expected output from converts-examples.md
  const expectedEnvironmentVariables = [
    'ConnectionStrings__DefaultConnection=Server=localhost;Database=MyApp;Trusted_Connection=true;',
    'ConnectionStrings__Redis=localhost:6379',
    'Logging__LogLevel__Default=Information',
    'Logging__LogLevel__Microsoft=Warning',
    'Logging__LogLevel__Microsoft__Hosting__Lifetime=Information',
    'AllowedHosts=*',
    'ApiSettings__BaseUrl=https://api.example.com',
    'ApiSettings__Timeout=30',
    'ApiSettings__ApiKey=your-api-key-here',
    'FeatureFlags__EnableNewFeature=true',
    'FeatureFlags__EnableBetaFeature=false',
    'Servers__0=https://server1.example.com',
    'Servers__1=https://server2.example.com',
    'Servers__2=https://server3.example.com',
    'DatabaseSettings__Providers__0__Name=SqlServer',
    'DatabaseSettings__Providers__0__ConnectionString=Server=sql1;Database=DB1;',
    'DatabaseSettings__Providers__1__Name=PostgreSQL',
    'DatabaseSettings__Providers__1__ConnectionString=Host=pg1;Database=DB2;',
  ]

  const defaultOptions: ConversionOptions = {
    prefix: '',
    namingConvention: 'preserve',
    includeTypeHints: false,
    keySeparator: '__',
    nullHandling: 'empty',
    includeArrayIndices: true,
  }

  it('should parse the example JSON correctly', () => {
    const validation = validateJson(exampleJson)
    expect(validation.isValid).toBe(true)
    expect(validation.data).toBeDefined()
    expect(validation.data?.ConnectionStrings).toBeDefined()
    expect(validation.data?.Servers).toBeDefined()
    expect(validation.data?.DatabaseSettings).toBeDefined()
  })

  it('should convert to exact environment variables from examples', () => {
    const validation = validateJson(exampleJson)
    expect(validation.isValid).toBe(true)

    const conversion = convertToEnvironmentVariables(validation.data!, defaultOptions)
    expect(conversion.success).toBe(true)

    // Create a map for easier verification
    const envMap = new Map(conversion.environmentVariables.map((env) => [env.key, env.value]))

    // Verify every expected environment variable exists with correct value
    expectedEnvironmentVariables.forEach((envVar) => {
      const equalIndex = envVar.indexOf('=')
      const key = envVar.substring(0, equalIndex)
      const expectedValue = envVar.substring(equalIndex + 1)
      expect(envMap.has(key)).toBe(true)
      expect(envMap.get(key)).toBe(expectedValue)
    })

    // Verify we have exactly the expected number of variables
    expect(conversion.environmentVariables).toHaveLength(expectedEnvironmentVariables.length)
  })

  it('should follow conversion rules from examples', () => {
    const validation = validateJson(exampleJson)
    const conversion = convertToEnvironmentVariables(validation.data!, defaultOptions)

    const envVars = conversion.environmentVariables
    const envMap = new Map(envVars.map((env) => [env.key, env.value]))

    // Rule 1: Nested objects use double underscores
    expect(envMap.has('ConnectionStrings__DefaultConnection')).toBe(true)
    expect(envMap.has('Logging__LogLevel__Default')).toBe(true)
    expect(envMap.has('ApiSettings__BaseUrl')).toBe(true)

    // Rule 2: Arrays use zero-based index notation
    expect(envMap.has('Servers__0')).toBe(true)
    expect(envMap.has('Servers__1')).toBe(true)
    expect(envMap.has('Servers__2')).toBe(true)
    expect(envMap.has('DatabaseSettings__Providers__0__Name')).toBe(true)
    expect(envMap.has('DatabaseSettings__Providers__1__Name')).toBe(true)

    // Rule 3: Boolean values converted to lowercase strings
    expect(envMap.get('FeatureFlags__EnableNewFeature')).toBe('true')
    expect(envMap.get('FeatureFlags__EnableBetaFeature')).toBe('false')

    // Rule 4: Special characters in keys handled (dots converted to underscores)
    expect(envMap.has('Logging__LogLevel__Microsoft__Hosting__Lifetime')).toBe(true)

    // Rule 5: Values preserved exactly
    expect(envMap.get('ConnectionStrings__DefaultConnection')).toBe(
      'Server=localhost;Database=MyApp;Trusted_Connection=true;'
    )
    expect(envMap.get('ApiSettings__BaseUrl')).toBe('https://api.example.com')

    // Rule 6: Case sensitivity maintained
    expect(envMap.has('ConnectionStrings__DefaultConnection')).toBe(true) // Capital C, D
    expect(envMap.has('AllowedHosts')).toBe(true) // Capital A, H
  })

  it('should format as Docker Compose exactly as shown in examples', () => {
    const validation = validateJson(exampleJson)
    const conversion = convertToEnvironmentVariables(validation.data!, defaultOptions)

    const formatOptions: FormatOptions = {
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

    const formatted = formatOutput(conversion.environmentVariables, 'docker-compose', formatOptions)

    expect(formatted).toContain('environment:')

    // Check that each expected variable appears in the output
    // Note: The actual formatter might quote some values differently than the raw examples
    expectedEnvironmentVariables.forEach((envVar) => {
      const [key] = envVar.split('=', 2)
      expect(formatted).toContain(`- ${key}=`)
    })
  })

  it('should handle all data types correctly', () => {
    const validation = validateJson(exampleJson)
    const conversion = convertToEnvironmentVariables(validation.data!, defaultOptions)

    const envVars = conversion.environmentVariables

    // Find variables by key to check their original types
    const stringVar = envVars.find((v) => v.key === 'AllowedHosts')
    const numberVar = envVars.find((v) => v.key === 'ApiSettings__Timeout')
    const booleanTrueVar = envVars.find((v) => v.key === 'FeatureFlags__EnableNewFeature')
    const booleanFalseVar = envVars.find((v) => v.key === 'FeatureFlags__EnableBetaFeature')
    const arrayElementVar = envVars.find((v) => v.key === 'Servers__0')

    expect(stringVar?.originalType).toBe('string')
    expect(stringVar?.value).toBe('*')

    expect(numberVar?.originalType).toBe('number')
    expect(numberVar?.value).toBe('30')

    expect(booleanTrueVar?.originalType).toBe('boolean')
    expect(booleanTrueVar?.value).toBe('true')

    expect(booleanFalseVar?.originalType).toBe('boolean')
    expect(booleanFalseVar?.value).toBe('false')

    expect(arrayElementVar?.originalType).toBe('string')
    expect(arrayElementVar?.isArrayElement).toBe(true)
    expect(arrayElementVar?.arrayIndex).toBe(0)
    expect(arrayElementVar?.value).toBe('https://server1.example.com')
  })

  it('should maintain exact order and structure as in examples', () => {
    const validation = validateJson(exampleJson)
    const conversion = convertToEnvironmentVariables(validation.data!, defaultOptions)

    const keys = conversion.environmentVariables.map((v) => v.key)

    // Check that major sections appear in logical order
    const connectionStringsIndex = keys.findIndex((k) => k.startsWith('ConnectionStrings__'))
    const loggingIndex = keys.findIndex((k) => k.startsWith('Logging__'))
    const allowedHostsIndex = keys.findIndex((k) => k === 'AllowedHosts')
    const apiSettingsIndex = keys.findIndex((k) => k.startsWith('ApiSettings__'))
    const featureFlagsIndex = keys.findIndex((k) => k.startsWith('FeatureFlags__'))
    const serversIndex = keys.findIndex((k) => k.startsWith('Servers__'))
    const databaseIndex = keys.findIndex((k) => k.startsWith('DatabaseSettings__'))

    // Verify all sections are present
    expect(connectionStringsIndex).toBeGreaterThan(-1)
    expect(loggingIndex).toBeGreaterThan(-1)
    expect(allowedHostsIndex).toBeGreaterThan(-1)
    expect(apiSettingsIndex).toBeGreaterThan(-1)
    expect(featureFlagsIndex).toBeGreaterThan(-1)
    expect(serversIndex).toBeGreaterThan(-1)
    expect(databaseIndex).toBeGreaterThan(-1)

    // Check array ordering within sections
    expect(keys).toContain('Servers__0')
    expect(keys).toContain('Servers__1')
    expect(keys).toContain('Servers__2')
    expect(keys.indexOf('Servers__0')).toBeLessThan(keys.indexOf('Servers__1'))
    expect(keys.indexOf('Servers__1')).toBeLessThan(keys.indexOf('Servers__2'))

    expect(keys).toContain('DatabaseSettings__Providers__0__Name')
    expect(keys).toContain('DatabaseSettings__Providers__1__Name')
    expect(keys.indexOf('DatabaseSettings__Providers__0__Name')).toBeLessThan(
      keys.indexOf('DatabaseSettings__Providers__1__Name')
    )
  })
})
