/**
 * Example usage of the conversion service
 * This file demonstrates how UI components would use the service
 */

import {
  convertToDockerCompose,
  convertToEnvFile,
  convertToPlainText,
  validateAppsettingsJson,
  convertAppsettingsToEnvironmentVariables,
} from './conversion-service'

// Example JSON from converts-examples.md (complete version)
const exampleAppsettingsJson = `{
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

/**
 * Example 1: Simple Docker Compose conversion (most common use case)
 */
export async function simpleDockerComposeExample() {
  const result = await convertToDockerCompose(exampleAppsettingsJson)
  
  if (result.success) {
    console.log('✅ Conversion successful!')
    console.log('Docker Compose output:')
    console.log(result.output)
    console.log(`Generated ${result.environmentVariables?.length} environment variables`)
  } else {
    console.error('❌ Conversion failed:', result.error?.message)
    if (result.error?.lineNumber) {
      console.error(`Error at line ${result.error.lineNumber}, column ${result.error.columnNumber}`)
    }
  }
  
  return result
}

/**
 * Example 2: Advanced conversion with custom options
 */
export async function advancedConversionExample() {
  const result = await convertAppsettingsToEnvironmentVariables({
    jsonInput: exampleAppsettingsJson,
    outputFormat: 'env-file',
    conversionOptions: {
      prefix: 'MYAPP_',
      namingConvention: 'uppercase',
      nullHandling: 'omit',
      includeArrayIndices: true,
    },
    formatOptions: {
      envFile: {
        includeComments: true,
        quoteValues: false,
      },
    },
  })

  if (result.success) {
    console.log('✅ Advanced conversion successful!')
    console.log('.env file output:')
    console.log(result.output)
    
    // Show statistics
    if (result.stats) {
      console.log('\n📊 Statistics:')
      console.log(`- Total variables: ${result.stats.totalVariables}`)
      console.log(`- Max nesting depth: ${result.stats.maxDepth}`)
      console.log(`- Arrays found: ${result.stats.arrayCount}`)
      
      if (result.stats.recommendations.length > 0) {
        console.log('\n💡 Recommendations:')
        result.stats.recommendations.forEach(rec => console.log(`- ${rec}`))
      }
    }

    // Show warnings if any
    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:')
      result.warnings.forEach(warning => console.log(`- ${warning}`))
    }
  } else {
    console.error('❌ Advanced conversion failed:', result.error?.message)
  }

  return result
}

/**
 * Example 3: Just validation (useful for real-time feedback)
 */
export async function validationExample() {
  const validation = await validateAppsettingsJson(exampleAppsettingsJson)
  
  if (validation.isValid) {
    console.log('✅ JSON is valid!')
    if (validation.warnings.length > 0) {
      console.log('⚠️ Warnings found:')
      validation.warnings.forEach(warning => console.log(`- ${warning}`))
    }
  } else {
    console.error('❌ JSON is invalid:', validation.error)
    if (validation.lineNumber) {
      console.error(`Error location: line ${validation.lineNumber}, column ${validation.columnNumber}`)
    }
  }

  return validation
}

/**
 * Example 4: Converting to different formats
 */
export async function multiFormatExample() {
  console.log('🔄 Converting to all formats...\n')

  // Docker Compose
  const dockerResult = await convertToDockerCompose(exampleAppsettingsJson, {
    useArrayFormat: true,
    indentLevel: 2,
  })

  // .env file
  const envResult = await convertToEnvFile(exampleAppsettingsJson, {
    includeComments: true,
    quoteValues: true,
  })

  // Plain text with exports
  const plainResult = await convertToPlainText(exampleAppsettingsJson, {
    includeExport: true,
    separator: '=',
  })

  return {
    dockerCompose: dockerResult,
    envFile: envResult,
    plainText: plainResult,
  }
}

/**
 * Example 5: Error handling
 */
export async function errorHandlingExample() {
  const invalidJson = `{
    "ConnectionStrings": {
      "Default": "test",
    }
  }`

  const result = await convertToDockerCompose(invalidJson)
  
  if (!result.success) {
    console.log('✅ Error handling works correctly!')
    console.log('Error type:', result.error?.type)
    console.log('Error message:', result.error?.message)
    if (result.error?.lineNumber) {
      console.log(`Error location: line ${result.error.lineNumber}`)
    }
  }

  return result
}

/**
 * Example 6: UI Component pattern (how React/Vue components would use this)
 */
export class AppsettingsConverter {
  private currentJson = ''
  private lastResult: any = null

  // Method that UI would call when user types in JSON textarea
  async onJsonChange(jsonInput: string) {
    this.currentJson = jsonInput.trim()
    
    if (!this.currentJson) {
      return { isValid: false, isEmpty: true }
    }

    // Real-time validation (fast)
    const validation = await validateAppsettingsJson(this.currentJson)
    return validation
  }

  // Method that UI would call when user clicks "Convert" button
  async convertToFormat(format: 'docker-compose' | 'env-file' | 'plain-text', options?: any) {
    if (!this.currentJson) {
      throw new Error('No JSON input provided')
    }

    let result
    switch (format) {
      case 'docker-compose':
        result = await convertToDockerCompose(this.currentJson, options)
        break
      case 'env-file':
        result = await convertToEnvFile(this.currentJson, options)
        break
      case 'plain-text':
        result = await convertToPlainText(this.currentJson, options)
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    this.lastResult = result
    return result
  }

  // Method to get the last conversion result (for UI state management)
  getLastResult() {
    return this.lastResult
  }

  // Method to download the converted output
  downloadResult(filename?: string) {
    if (!this.lastResult?.success) {
      throw new Error('No successful conversion result to download')
    }

    const blob = new Blob([this.lastResult.output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'converted-environment-variables.txt'
    a.click()
    
    URL.revokeObjectURL(url)
  }
}

// Export example runner function
export async function runAllExamples() {
  console.log('🚀 Running Conversion Service Examples...\n')

  console.log('📝 Example 1: Simple Docker Compose conversion')
  await simpleDockerComposeExample()

  console.log('\n📝 Example 2: Advanced conversion with options')
  await advancedConversionExample()

  console.log('\n📝 Example 3: JSON validation only')
  await validationExample()

  console.log('\n📝 Example 4: Multiple format conversion')
  await multiFormatExample()

  console.log('\n📝 Example 5: Error handling')
  await errorHandlingExample()

  console.log('\n✨ All examples completed!')
}