/**
 * Unit tests for conversion service
 */

import { describe, it, expect } from 'vitest'
import {
  convertAppsettingsToEnvironmentVariables,
  convertToDockerCompose,
  convertToEnvFile,
  convertToPlainText,
  validateAppsettingsJson,
} from '../core/conversion-service'

describe('Conversion Service', () => {
  // Use the exact same JSON as converts-examples.md
  const validJson = `{
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

  const invalidJson = `{
    "ConnectionStrings": {
      "DefaultConnection": "Server=localhost;Database=Test;",
    }
  }`

  describe('convertAppsettingsToEnvironmentVariables', () => {
    it('should successfully convert valid JSON to Docker Compose format', async () => {
      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: validJson,
        outputFormat: 'docker-compose',
      })

      expect(result.success).toBe(true)
      expect(result.output).toContain('environment:')
      expect(result.output).toContain('ConnectionStrings__DefaultConnection')
      expect(result.output).toContain('ConnectionStrings__Redis')
      expect(result.output).toContain('DatabaseSettings__Providers__0__Name')
      expect(result.environmentVariables).toBeDefined()
      expect(result.environmentVariables!.length).toBe(18) // Should match exact count from converts-examples.md
      expect(result.stats).toBeDefined()
      expect(result.stats!.totalVariables).toBeGreaterThan(10)
      expect(result.stats!.arrayCount).toBe(2) // Servers array + Providers array
    })

    it('should handle invalid JSON gracefully', async () => {
      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: invalidJson,
        outputFormat: 'docker-compose',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error!.type).toBe('VALIDATION_FAILED')
      expect(result.error!.message).toContain('JSON')
    })

    it('should apply custom conversion options', async () => {
      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: validJson,
        outputFormat: 'env-file',
        conversionOptions: {
          prefix: 'APP_',
          namingConvention: 'uppercase',
          nullHandling: 'omit',
        },
      })

      expect(result.success).toBe(true)
      
      // Check that variables have the prefix and are uppercase
      const hasUppercaseWithPrefix = result.environmentVariables!.some(
        env => env.key.startsWith('APP_') && env.key === env.key.toUpperCase()
      )
      expect(hasUppercaseWithPrefix).toBe(true)
    })

    it('should handle conversion errors gracefully', async () => {
      // Test with empty object which should work but generate warnings
      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: '{}',
        outputFormat: 'docker-compose',
      })

      expect(result.success).toBe(true)
      expect(result.environmentVariables).toHaveLength(0)
      expect(result.stats!.totalVariables).toBe(0)
    })

    it('should provide comprehensive statistics', async () => {
      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: validJson,
        outputFormat: 'docker-compose',
      })

      expect(result.success).toBe(true)
      expect(result.stats).toBeDefined()
      expect(result.stats!.totalVariables).toBeGreaterThan(10)
      expect(result.stats!.maxDepth).toBeGreaterThan(2)
      expect(result.stats!.arrayCount).toBe(2)
      expect(Array.isArray(result.stats!.recommendations)).toBe(true)
    })

    it('should handle all output formats', async () => {
      const formats = ['docker-compose', 'env-file', 'plain-text'] as const
      
      for (const format of formats) {
        const result = await convertAppsettingsToEnvironmentVariables({
          jsonInput: validJson,
          outputFormat: format,
        })

        expect(result.success).toBe(true)
        expect(result.output).toBeDefined()
        expect(result.output!.length).toBeGreaterThan(0)
      }
    })

    it('should collect and return warnings', async () => {
      const jsonWithWarnings = `{
        "ConnectionStrings": {
          "EmptyConnection": ""
        },
        "Logging": {
          "LogLevel": {
            "Default": 123
          }
        },
        "CustomArray": ["item1", "item2"]
      }`

      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: jsonWithWarnings,
        outputFormat: 'docker-compose',
      })

      expect(result.success).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      
      // Should have warnings about empty connection string and non-string log level
      expect(result.warnings.some(w => w.includes('empty'))).toBe(true)
      expect(result.warnings.some(w => w.includes('should be a string'))).toBe(true)
      // Note: Removed root array warning as array properties are valid in appsettings.json
    })
  })

  describe('convertToDockerCompose', () => {
    it('should convert to Docker Compose with default options', async () => {
      const result = await convertToDockerCompose(validJson)

      expect(result.success).toBe(true)
      expect(result.output).toContain('environment:')
      expect(result.output).toContain('  - ')  // Array format
    })

    it('should support custom Docker Compose options', async () => {
      const result = await convertToDockerCompose(validJson, {
        useArrayFormat: false,
        indentLevel: 4,
      })

      expect(result.success).toBe(true)
      expect(result.output).toContain('environment:')
      expect(result.output).not.toContain('  - ')  // Object format
      expect(result.output).toMatch(/^ {4}\w/m)  // 4-space indentation
    })

    it('should apply conversion options', async () => {
      const result = await convertToDockerCompose(validJson, {
        conversionOptions: {
          prefix: 'DOCKER_',
          namingConvention: 'uppercase',
        },
      })

      expect(result.success).toBe(true)
      expect(result.output).toContain('DOCKER_')
    })
  })

  describe('convertToEnvFile', () => {
    it('should convert to .env file with default options', async () => {
      const result = await convertToEnvFile(validJson)

      expect(result.success).toBe(true)
      expect(result.output).toContain('# Generated from appsettings.json')
      expect(result.output).toContain('ConnectionStrings__DefaultConnection=')
      expect(result.output).toContain('"')  // Quoted values
    })

    it('should support custom .env file options', async () => {
      const result = await convertToEnvFile(validJson, {
        includeComments: false,
        quoteValues: false,
      })

      expect(result.success).toBe(true)
      expect(result.output).not.toContain('# Generated from appsettings.json')
      expect(result.output).not.toContain('"')  // Unquoted values
    })
  })

  describe('convertToPlainText', () => {
    it('should convert to plain text with default options', async () => {
      const result = await convertToPlainText(validJson)

      expect(result.success).toBe(true)
      expect(result.output).toContain('ConnectionStrings__DefaultConnection=')
      expect(result.output).not.toContain('export ')
    })

    it('should support custom plain text options', async () => {
      const result = await convertToPlainText(validJson, {
        includeExport: true,
        separator: ': ',
      })

      expect(result.success).toBe(true)
      expect(result.output).toContain('export ')
      expect(result.output).toContain(': ')
    })
  })

  describe('validateAppsettingsJson', () => {
    it('should validate correct JSON', async () => {
      const result = await validateAppsettingsJson(validJson)

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('should reject invalid JSON', async () => {
      const result = await validateAppsettingsJson(invalidJson)

      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.lineNumber).toBeDefined()
      expect(result.columnNumber).toBeDefined()
    })

    it('should provide warnings for unusual patterns', async () => {
      const jsonWithWarnings = `{
        "ConnectionStrings": {
          "EmptyConnection": ""
        },
        "key.with.dots": "value"
      }`

      const result = await validateAppsettingsJson(jsonWithWarnings)

      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('empty'))).toBe(true)
      expect(result.warnings.some(w => w.includes('dots'))).toBe(true)
    })

    it('should handle completely invalid JSON', async () => {
      const result = await validateAppsettingsJson('not json at all')

      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject non-object root', async () => {
      const result = await validateAppsettingsJson('["array", "root"]')

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Root element must be a JSON object')
    })
  })

  describe('error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: '{"malformed": json}',
        outputFormat: 'docker-compose',
      })

      expect(result.success).toBe(false)
      expect(result.error!.type).toBe('VALIDATION_FAILED')
      expect(result.error!.message).toContain('JSON')
    })

    it('should handle unsupported output format gracefully', async () => {
      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: validJson,
        outputFormat: 'unsupported' as any,
      })

      expect(result.success).toBe(false)
      expect(result.error!.type).toBe('FORMATTING_FAILED')
    })

    it('should provide detailed error information', async () => {
      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: '{"key": "value"',  // Missing closing brace
        outputFormat: 'docker-compose',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error!.message).toBeDefined()
      expect(result.error!.lineNumber).toBeDefined()
      expect(result.error!.columnNumber).toBeDefined()
    })
  })

  describe('integration with converts-examples.md', () => {
    // Use the exact same JSON as the main tests (which is from converts-examples.md)
    it('should process the example JSON correctly', async () => {
      const result = await convertToDockerCompose(validJson)

      expect(result.success).toBe(true)
      expect(result.environmentVariables).toBeDefined()
      expect(result.environmentVariables!.length).toBe(18) // Exact count from converts-examples.md
      
      const envMap = new Map(result.environmentVariables!.map(env => [env.key, env.value]))
      
      // Check all key conversions from converts-examples.md
      expect(envMap.has('ConnectionStrings__DefaultConnection')).toBe(true)
      expect(envMap.has('ConnectionStrings__Redis')).toBe(true)
      expect(envMap.has('Logging__LogLevel__Default')).toBe(true)
      expect(envMap.has('Logging__LogLevel__Microsoft')).toBe(true)
      expect(envMap.has('Logging__LogLevel__Microsoft__Hosting__Lifetime')).toBe(true)
      expect(envMap.has('AllowedHosts')).toBe(true)
      expect(envMap.has('ApiSettings__BaseUrl')).toBe(true)
      expect(envMap.has('ApiSettings__Timeout')).toBe(true)
      expect(envMap.has('ApiSettings__ApiKey')).toBe(true)
      expect(envMap.has('FeatureFlags__EnableNewFeature')).toBe(true)
      expect(envMap.has('FeatureFlags__EnableBetaFeature')).toBe(true)
      expect(envMap.has('Servers__0')).toBe(true)
      expect(envMap.has('Servers__1')).toBe(true)
      expect(envMap.has('Servers__2')).toBe(true)
      expect(envMap.has('DatabaseSettings__Providers__0__Name')).toBe(true)
      expect(envMap.has('DatabaseSettings__Providers__0__ConnectionString')).toBe(true)
      expect(envMap.has('DatabaseSettings__Providers__1__Name')).toBe(true)
      expect(envMap.has('DatabaseSettings__Providers__1__ConnectionString')).toBe(true)
      
      // Check exact value preservation from converts-examples.md
      expect(envMap.get('ConnectionStrings__DefaultConnection')).toBe('Server=localhost;Database=MyApp;Trusted_Connection=true;')
      expect(envMap.get('ConnectionStrings__Redis')).toBe('localhost:6379')
      expect(envMap.get('Logging__LogLevel__Default')).toBe('Information')
      expect(envMap.get('Logging__LogLevel__Microsoft')).toBe('Warning')
      expect(envMap.get('Logging__LogLevel__Microsoft__Hosting__Lifetime')).toBe('Information')
      expect(envMap.get('AllowedHosts')).toBe('*')
      expect(envMap.get('ApiSettings__BaseUrl')).toBe('https://api.example.com')
      expect(envMap.get('ApiSettings__Timeout')).toBe('30')
      expect(envMap.get('ApiSettings__ApiKey')).toBe('your-api-key-here')
      expect(envMap.get('FeatureFlags__EnableNewFeature')).toBe('true')
      expect(envMap.get('FeatureFlags__EnableBetaFeature')).toBe('false')
      expect(envMap.get('Servers__0')).toBe('https://server1.example.com')
      expect(envMap.get('Servers__1')).toBe('https://server2.example.com')
      expect(envMap.get('Servers__2')).toBe('https://server3.example.com')
      expect(envMap.get('DatabaseSettings__Providers__0__Name')).toBe('SqlServer')
      expect(envMap.get('DatabaseSettings__Providers__0__ConnectionString')).toBe('Server=sql1;Database=DB1;')
      expect(envMap.get('DatabaseSettings__Providers__1__Name')).toBe('PostgreSQL')
      expect(envMap.get('DatabaseSettings__Providers__1__ConnectionString')).toBe('Host=pg1;Database=DB2;')
    })
  })
})