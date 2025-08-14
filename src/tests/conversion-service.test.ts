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
  const validJson = `{
    "ConnectionStrings": {
      "DefaultConnection": "Server=localhost;Database=Test;"
    },
    "ApiSettings": {
      "BaseUrl": "https://api.example.com",
      "Timeout": 30
    },
    "FeatureFlags": {
      "EnableNewFeature": true
    },
    "Servers": ["server1.com", "server2.com"]
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
      expect(result.environmentVariables).toBeDefined()
      expect(result.environmentVariables!.length).toBeGreaterThan(0)
      expect(result.stats).toBeDefined()
      expect(result.stats!.totalVariables).toBeGreaterThan(0)
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
    })

    it('should provide comprehensive statistics', async () => {
      const result = await convertAppsettingsToEnvironmentVariables({
        jsonInput: validJson,
        outputFormat: 'docker-compose',
      })

      expect(result.success).toBe(true)
      expect(result.stats).toBeDefined()
      expect(result.stats!.totalVariables).toBeGreaterThan(0)
      expect(result.stats!.maxDepth).toBeGreaterThan(0)
      expect(result.stats!.arrayCount).toBeGreaterThan(0)
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
      
      // Should have warnings about empty connection string, non-string log level, and root array
      expect(result.warnings.some(w => w.includes('empty'))).toBe(true)
      expect(result.warnings.some(w => w.includes('should be a string'))).toBe(true)
      expect(result.warnings.some(w => w.includes('Array found at root level'))).toBe(true)
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
    const exampleJson = `{
      "ConnectionStrings": {
        "DefaultConnection": "Server=localhost;Database=MyApp;Trusted_Connection=true;",
        "Redis": "localhost:6379"
      },
      "Logging": {
        "LogLevel": {
          "Default": "Information",
          "Microsoft": "Warning"
        }
      },
      "AllowedHosts": "*",
      "ApiSettings": {
        "Timeout": 30
      },
      "FeatureFlags": {
        "EnableNewFeature": true,
        "EnableBetaFeature": false
      },
      "Servers": [
        "https://server1.example.com",
        "https://server2.example.com"
      ]
    }`

    it('should process the example JSON correctly', async () => {
      const result = await convertToDockerCompose(exampleJson)

      expect(result.success).toBe(true)
      expect(result.environmentVariables).toBeDefined()
      
      const envMap = new Map(result.environmentVariables!.map(env => [env.key, env.value]))
      
      // Check key conversions from examples
      expect(envMap.has('ConnectionStrings__DefaultConnection')).toBe(true)
      expect(envMap.has('Logging__LogLevel__Default')).toBe(true)
      expect(envMap.has('Servers__0')).toBe(true)
      expect(envMap.has('Servers__1')).toBe(true)
      
      // Check value preservation
      expect(envMap.get('ConnectionStrings__DefaultConnection')).toBe('Server=localhost;Database=MyApp;Trusted_Connection=true;')
      expect(envMap.get('AllowedHosts')).toBe('*')
      expect(envMap.get('ApiSettings__Timeout')).toBe('30')
      expect(envMap.get('FeatureFlags__EnableNewFeature')).toBe('true')
      expect(envMap.get('FeatureFlags__EnableBetaFeature')).toBe('false')
    })
  })
})