<template>
  <div id="app">
    <header class="app-header">
      <h1 class="app-title">AppSettings to Docker Compose Converter</h1>
      <p class="app-description">
        Convert .NET appsettings.json files to Docker Compose environment variables format
      </p>
    </header>

    <main class="app-main">
      <div class="container">
        <!-- Input Section -->
        <section class="input-section">
          <h2>Input</h2>
          <div class="input-methods">
            <div class="method-tabs">
              <button 
                class="tab-button"
                :class="{ active: inputMethod === 'editor' }"
                @click="setInputMethod('editor')"
              >
                JSON Editor
              </button>
              <button 
                class="tab-button"
                :class="{ active: inputMethod === 'upload' }"
                @click="setInputMethod('upload')"
              >
                File Upload
              </button>
            </div>

            <div class="method-content">
              <div v-if="inputMethod === 'editor'" class="editor-container">
                <div class="editor-header">
                  <label for="json-input" class="editor-label">Paste your appsettings.json content:</label>
                  <button 
                    v-if="jsonInput"
                    class="clear-button"
                    @click="clearInput"
                    title="Clear input"
                  >
                    Clear
                  </button>
                </div>
                <textarea
                  id="json-input"
                  v-model="jsonInput"
                  class="json-editor"
                  placeholder="Paste your appsettings.json content here..."
                  rows="12"
                  @input="handleJsonInput"
                ></textarea>
                <div v-if="validationError" class="validation-error">
                  <strong>Validation Error:</strong> {{ validationError }}
                </div>
                <div v-if="validationWarnings.length > 0" class="validation-warnings">
                  <strong>Warnings:</strong>
                  <ul>
                    <li v-for="warning in validationWarnings" :key="warning">{{ warning }}</li>
                  </ul>
                </div>
              </div>

              <div v-if="inputMethod === 'upload'" class="upload-container">
                <FileUpload
                  @file-loaded="handleFileLoaded"
                  @file-removed="handleFileRemoved"
                  @error="handleUploadError"
                  :disabled="isConverting"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Settings Section -->
        <section class="settings-section">
          <h2>Conversion Settings</h2>
          <div class="settings-grid">
            <div class="setting-group">
              <label for="output-format" class="setting-label">Output Format:</label>
              <select id="output-format" v-model="selectedFormat" class="setting-select">
                <option value="docker-compose">Docker Compose</option>
                <option value="env-file">.env File</option>
                <option value="plain-text">Plain Text</option>
              </select>
            </div>

            <div class="setting-group">
              <label for="naming-convention" class="setting-label">Naming Convention:</label>
              <select id="naming-convention" v-model="namingConvention" class="setting-select">
                <option value="preserve">Preserve Original</option>
                <option value="uppercase">UPPERCASE</option>
                <option value="lowercase">lowercase</option>
              </select>
            </div>

            <div class="setting-group">
              <label for="prefix" class="setting-label">Variable Prefix:</label>
              <input 
                id="prefix" 
                v-model="variablePrefix" 
                type="text" 
                class="setting-input"
                placeholder="e.g., MYAPP_"
              />
            </div>

            <div class="setting-group">
              <label class="checkbox-label">
                <input 
                  v-model="includeTypeHints" 
                  type="checkbox" 
                  class="setting-checkbox"
                />
                Include Type Hints
              </label>
            </div>
          </div>
        </section>

        <!-- Output Section -->
        <section class="output-section">
          <OutputPreview
            :result="conversionResult"
            :selected-format="selectedFormat"
            :is-loading="isConverting"
            :error="conversionError"
            :has-retry="!!conversionError"
            @format-change="handleFormatChange"
            @copy="handleCopy"
            @download="handleDownload"
            @retry="handleRetry"
          />
        </section>
      </div>
    </main>

    <footer class="app-footer">
      <p>Built with Vue 3, TypeScript, and Vite</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { 
  convertToDockerCompose, 
  convertToEnvFile, 
  convertToPlainText,
  validateAppsettingsJson
} from './core/index'
import type { ConversionOptions, OutputFormat, ConversionServiceResult } from './core/types'
import FileUpload from './components/FileUpload.vue'
import OutputPreview from './components/OutputPreview.vue'

// Reactive state
const inputMethod = ref<'editor' | 'upload'>('editor')
const jsonInput = ref('')
const selectedFormat = ref<OutputFormat>('docker-compose')
const namingConvention = ref<'preserve' | 'uppercase' | 'lowercase'>('preserve')
const variablePrefix = ref('')
const includeTypeHints = ref(false)

// Validation state
const validationError = ref<string>('')
const validationWarnings = ref<string[]>([])

// Conversion state
const isConverting = ref(false)
const conversionResult = ref<ConversionServiceResult | null>(null)
const conversionError = ref<string>('')

// Computed properties
const conversionOptions = computed<Partial<ConversionOptions>>(() => ({
  prefix: variablePrefix.value || undefined,
  namingConvention: namingConvention.value,
  includeTypeHints: includeTypeHints.value,
  keySeparator: '__',
  nullHandling: 'empty',
  includeArrayIndices: true
}))

// Methods
const setInputMethod = (method: 'editor' | 'upload') => {
  inputMethod.value = method
}

const clearInput = () => {
  jsonInput.value = ''
  validationError.value = ''
  validationWarnings.value = []
  conversionResult.value = null
  conversionError.value = ''
}

const handleJsonInput = async () => {
  if (!jsonInput.value.trim()) {
    validationError.value = ''
    validationWarnings.value = []
    conversionResult.value = null
    conversionError.value = ''
    return
  }

  // Validate JSON
  try {
    const validation = await validateAppsettingsJson(jsonInput.value)
    if (validation.isValid) {
      validationError.value = ''
      validationWarnings.value = validation.warnings || []
      await convertJson()
    } else {
      validationError.value = validation.error || 'Invalid JSON'
      validationWarnings.value = []
      conversionResult.value = null
    }
  } catch (error) {
    validationError.value = error instanceof Error ? error.message : 'Validation failed'
    validationWarnings.value = []
    conversionResult.value = null
  }
}

const convertJson = async () => {
  if (!jsonInput.value.trim() || validationError.value) {
    return
  }

  isConverting.value = true
  conversionError.value = ''

  try {
    let result: ConversionServiceResult

    switch (selectedFormat.value) {
      case 'docker-compose':
        result = await convertToDockerCompose(jsonInput.value, {
          conversionOptions: conversionOptions.value,
          useArrayFormat: true,
          indentLevel: 2
        })
        break
      case 'env-file':
        result = await convertToEnvFile(jsonInput.value, {
          conversionOptions: conversionOptions.value,
          includeComments: includeTypeHints.value,
          quoteValues: true
        })
        break
      case 'plain-text':
        result = await convertToPlainText(jsonInput.value, {
          conversionOptions: conversionOptions.value,
          separator: '=',
          includeExport: false
        })
        break
      default:
        throw new Error(`Unsupported format: ${selectedFormat.value}`)
    }

    if (result.success) {
      conversionResult.value = result
      conversionError.value = ''
    } else {
      conversionError.value = result.error?.message || 'Conversion failed'
      conversionResult.value = null
    }
  } catch (error) {
    conversionError.value = error instanceof Error ? error.message : 'Conversion failed'
    conversionResult.value = null
  } finally {
    isConverting.value = false
  }
}

const copyToClipboard = async () => {
  if (!conversionResult.value?.output) return

  try {
    await navigator.clipboard.writeText(conversionResult.value.output)
    // You could add a toast notification here
    console.log('Copied to clipboard!')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = conversionResult.value.output
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

const downloadOutput = () => {
  if (!conversionResult.value?.output) return

  const fileName = getFileName()
  const blob = new Blob([conversionResult.value.output], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const getFileName = (): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const prefix = variablePrefix.value ? `${variablePrefix.value.replace(/[^a-zA-Z0-9]/g, '_')}_` : ''
  
  switch (selectedFormat.value) {
    case 'docker-compose':
      return `${prefix}docker-compose_${timestamp}.yml`
    case 'env-file':
      return `${prefix}environment_${timestamp}.env`
    case 'plain-text':
      return `${prefix}variables_${timestamp}.txt`
    default:
      return `${prefix}output_${timestamp}.txt`
  }
}

// New event handlers for components
const handleFileLoaded = (content: string, fileName: string) => {
  jsonInput.value = content
  // Also update validation and conversion
  handleJsonInput()
  console.log(`File loaded: ${fileName}`)
}

const handleFileRemoved = () => {
  clearInput()
}

const handleUploadError = (message: string) => {
  // You could show a toast notification here
  console.error('Upload error:', message)
}

const handleFormatChange = (format: OutputFormat) => {
  selectedFormat.value = format
}

const handleCopy = () => {
  // You could show a success toast here
  console.log('Content copied to clipboard')
}

const handleDownload = (format: OutputFormat, content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  console.log(`Downloaded: ${filename}`)
}

const handleRetry = () => {
  if (jsonInput.value.trim()) {
    convertJson()
  }
}

// Watch for changes in conversion settings
watch([selectedFormat, namingConvention, variablePrefix, includeTypeHints], () => {
  if (jsonInput.value.trim() && !validationError.value) {
    convertJson()
  }
})

// Load example data on mount (optional)
// You could uncomment this to provide example data
/*
import { onMounted } from 'vue'
onMounted(() => {
  jsonInput.value = `{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=MyApp;",
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
    "BaseUrl": "https://api.example.com",
    "Timeout": 30
  }
}`
  handleJsonInput()
})
*/
</script>

<style scoped>
/* Main layout */
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem 0;
  text-align: center;
}

.app-title {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.app-description {
  margin: 0;
  font-size: 1.1rem;
  opacity: 0.9;
}

.app-main {
  flex: 1;
  padding: 2rem 0;
  background-color: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Sections */
section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

section h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  font-size: 1.5rem;
}

/* Input methods */
.method-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.tab-button:hover {
  border-color: #667eea;
  color: #667eea;
}

.tab-button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* Editor */
.editor-container {
  width: 100%;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.editor-label {
  font-weight: 600;
  color: #495057;
}

.clear-button {
  padding: 0.25rem 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.clear-button:hover {
  background: #c82333;
}

.json-editor {
  width: 100%;
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s;
}

.json-editor:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Validation */
.validation-error {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  color: #721c24;
}

.validation-warnings {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  color: #856404;
}

.validation-warnings ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

/* Settings */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-label {
  font-weight: 600;
  color: #495057;
}

.setting-select,
.setting-input {
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.setting-select:focus,
.setting-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  color: #495057;
}

.setting-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

/* Upload container styling */
.upload-container {
  width: 100%;
}

/* Footer */
.app-footer {
  background: #2c3e50;
  color: white;
  text-align: center;
  padding: 1rem;
  margin-top: auto;
}

.app-footer p {
  margin: 0;
  opacity: 0.8;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-title {
    font-size: 2rem;
  }
  
  .container {
    padding: 0 0.5rem;
  }
  
  section {
    padding: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>