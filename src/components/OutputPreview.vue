<template>
  <div class="output-preview">
    <div class="preview-header">
      <h2>Output Preview</h2>
      <div v-if="hasOutput" class="header-actions">
        <div class="format-tabs">
          <button
            v-for="format in outputFormats"
            :key="format.key"
            class="format-tab"
            :class="{ active: selectedFormat === format.key }"
            @click="setFormat(format.key)"
            :title="format.description"
          >
            {{ format.label }}
          </button>
        </div>
        <div class="action-buttons">
          <button
            class="copy-button"
            @click="copyToClipboard"
            :disabled="!hasOutput"
            :title="copyButtonTitle"
          >
            {{ copyButtonText }}
          </button>
          <button
            class="download-button"
            @click="downloadOutput"
            :disabled="!hasOutput"
            title="Download output file"
          >
            Download
          </button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Generating {{ getCurrentFormatLabel() }} output...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">❌</div>
      <h3>Conversion Error</h3>
      <p class="error-message">{{ error }}</p>
      <button v-if="hasRetry" class="retry-button" @click="retry">
        Try Again
      </button>
    </div>

    <div v-else-if="hasOutput" class="output-container">
      <!-- Output Statistics -->
      <div class="output-stats">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ result?.environmentVariables?.length || 0 }}</span>
            <span class="stat-label">Variables</span>
          </div>
          <div v-if="result?.stats" class="stat-card">
            <span class="stat-value">{{ result.stats.arrayCount }}</span>
            <span class="stat-label">Arrays</span>
          </div>
          <div v-if="result?.stats" class="stat-card">
            <span class="stat-value">{{ result.stats.maxDepth }}</span>
            <span class="stat-label">Max Depth</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ formatFileSize(outputSize) }}</span>
            <span class="stat-label">Output Size</span>
          </div>
        </div>
      </div>

      <!-- Format-specific Info -->
      <div class="format-info">
        <div class="format-description">
          <strong>{{ getCurrentFormatLabel() }}:</strong>
          {{ getCurrentFormatDescription() }}
        </div>
        <div v-if="selectedFormat === 'docker-compose'" class="format-usage">
          <p><strong>Usage:</strong> Copy this into your <code>docker-compose.yml</code> under the service definition</p>
        </div>
        <div v-else-if="selectedFormat === 'env-file'" class="format-usage">
          <p><strong>Usage:</strong> Save as <code>.env</code> file in your project root</p>
        </div>
        <div v-else-if="selectedFormat === 'plain-text'" class="format-usage">
          <p><strong>Usage:</strong> Use these environment variables in your deployment scripts</p>
        </div>
      </div>

      <!-- Code Output -->
      <div class="code-container">
        <div class="code-header">
          <span class="code-language">{{ getCodeLanguage() }}</span>
          <button 
            class="code-copy-button"
            @click="copyToClipboard"
            :title="copyButtonTitle"
          >
            {{ copyButtonText }}
          </button>
        </div>
        <pre class="code-content" :class="getCodeClass()"><code>{{ result?.output || '' }}</code></pre>
      </div>

      <!-- Warnings -->
      <div v-if="result?.warnings && result.warnings.length > 0" class="warnings-section">
        <h4>⚠️ Warnings</h4>
        <ul class="warnings-list">
          <li v-for="warning in result.warnings" :key="warning" class="warning-item">
            {{ warning }}
          </li>
        </ul>
      </div>

      <!-- Recommendations -->
      <div v-if="result?.stats?.recommendations && result.stats.recommendations.length > 0" class="recommendations-section">
        <h4>💡 Recommendations</h4>
        <ul class="recommendations-list">
          <li v-for="recommendation in result.stats.recommendations" :key="recommendation" class="recommendation-item">
            {{ recommendation }}
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">📝</div>
      <h3>No Output Yet</h3>
      <p>Enter valid JSON content to see the converted output</p>
      <div class="format-preview">
        <p>Available formats:</p>
        <ul>
          <li><strong>Docker Compose:</strong> YAML format for docker-compose.yml</li>
          <li><strong>.env File:</strong> Environment file with comments and type hints</li>
          <li><strong>Plain Text:</strong> Simple key=value format</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ConversionServiceResult, OutputFormat } from '../core/types'

// Props
interface Props {
  result?: ConversionServiceResult | null
  selectedFormat?: OutputFormat
  isLoading?: boolean
  error?: string
  hasRetry?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  result: null,
  selectedFormat: 'docker-compose',
  isLoading: false,
  error: '',
  hasRetry: false
})

// Emits
const emit = defineEmits<{
  formatChange: [format: OutputFormat]
  copy: []
  download: [format: OutputFormat, content: string, filename: string]
  retry: []
}>()

// State
const copyButtonText = ref('Copy')
const copyTimeout = ref<NodeJS.Timeout>()

// Output formats configuration
const outputFormats = [
  {
    key: 'docker-compose' as OutputFormat,
    label: 'Docker Compose',
    description: 'YAML format for docker-compose.yml files',
    language: 'yaml',
    extension: 'yml'
  },
  {
    key: 'env-file' as OutputFormat,
    label: '.env File',
    description: 'Environment file with comments and type information',
    language: 'bash',
    extension: 'env'
  },
  {
    key: 'plain-text' as OutputFormat,
    label: 'Plain Text',
    description: 'Simple key=value environment variables',
    language: 'text',
    extension: 'txt'
  }
]

// Computed properties
const hasOutput = computed(() => props.result?.success && props.result?.output)

const outputSize = computed(() => {
  return props.result?.output ? new Blob([props.result.output]).size : 0
})

const copyButtonTitle = computed(() => {
  return hasOutput.value ? 'Copy output to clipboard' : 'No output to copy'
})

const getCurrentFormat = () => {
  return outputFormats.find(f => f.key === props.selectedFormat) || outputFormats[0]
}

const getCurrentFormatLabel = () => getCurrentFormat().label
const getCurrentFormatDescription = () => getCurrentFormat().description
const getCodeLanguage = () => getCurrentFormat().language
const getCodeClass = () => `language-${getCurrentFormat().language}`

// Methods
const setFormat = (format: OutputFormat) => {
  emit('formatChange', format)
}

const copyToClipboard = async () => {
  if (!hasOutput.value) return

  try {
    await navigator.clipboard.writeText(props.result!.output!)
    copyButtonText.value = 'Copied!'
    
    // Reset button text after 2 seconds
    if (copyTimeout.value) {
      clearTimeout(copyTimeout.value)
    }
    copyTimeout.value = setTimeout(() => {
      copyButtonText.value = 'Copy'
    }, 2000)
    
    emit('copy')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea')
      textarea.value = props.result!.output!
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      
      copyButtonText.value = 'Copied!'
      
      if (copyTimeout.value) {
        clearTimeout(copyTimeout.value)
      }
      copyTimeout.value = setTimeout(() => {
        copyButtonText.value = 'Copy'
      }, 2000)
      
      emit('copy')
    } catch (fallbackError) {
      console.error('Fallback copy also failed:', fallbackError)
      copyButtonText.value = 'Copy Failed'
      
      setTimeout(() => {
        copyButtonText.value = 'Copy'
      }, 2000)
    }
  }
}

const downloadOutput = () => {
  if (!hasOutput.value) return

  const format = getCurrentFormat()
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `appsettings_converted_${timestamp}.${format.extension}`
  
  emit('download', props.selectedFormat, props.result!.output!, filename)
}

const retry = () => {
  emit('retry')
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Watch for format changes to reset copy button
watch(() => props.selectedFormat, () => {
  copyButtonText.value = 'Copy'
  if (copyTimeout.value) {
    clearTimeout(copyTimeout.value)
  }
})

// Cleanup timeout on unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (copyTimeout.value) {
    clearTimeout(copyTimeout.value)
  }
})
</script>

<style scoped>
.output-preview {
  width: 100%;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.preview-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

/* Format tabs */
.format-tabs {
  display: flex;
  gap: 0.25rem;
  background: #f8f9fa;
  padding: 0.25rem;
  border-radius: 8px;
}

.format-tab {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;
  color: #6c757d;
}

.format-tab:hover {
  background: #e9ecef;
  color: #495057;
}

.format-tab.active {
  background: #667eea;
  color: white;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
}

/* Action buttons */
.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.copy-button,
.download-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.copy-button {
  background: #28a745;
  color: white;
}

.copy-button:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.download-button {
  background: #007bff;
  color: white;
}

.download-button:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.copy-button:disabled,
.download-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Loading state */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e9ecef;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error state */
.error-state {
  text-align: center;
  padding: 3rem;
  background: #fff5f5;
  border-radius: 8px;
  border: 2px solid #fed7d7;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h3 {
  margin: 0 0 1rem 0;
  color: #e53e3e;
  font-size: 1.25rem;
}

.error-message {
  color: #718096;
  margin-bottom: 1.5rem;
}

.retry-button {
  background: #e53e3e;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #c53030;
}

/* Output container */
.output-container {
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

/* Output statistics */
.output-stats {
  padding: 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Format info */
.format-info {
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.format-description {
  color: #495057;
  margin-bottom: 0.5rem;
}

.format-usage {
  color: #6c757d;
  font-size: 0.875rem;
}

.format-usage code {
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
}

/* Code container */
.code-container {
  position: relative;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #2d3748;
  color: white;
  font-size: 0.875rem;
}

.code-language {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.code-copy-button {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.code-copy-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.code-content {
  margin: 0;
  padding: 1.5rem;
  background: #1a202c;
  color: #e2e8f0;
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
}

/* Language-specific styling */
.language-yaml {
  color: #e2e8f0;
}

.language-bash {
  color: #68d391;
}

.language-text {
  color: #cbd5e0;
}

/* Warnings and recommendations */
.warnings-section,
.recommendations-section {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
}

.warnings-section h4 {
  margin: 0 0 0.75rem 0;
  color: #d69e2e;
  font-size: 1rem;
}

.recommendations-section h4 {
  margin: 0 0 0.75rem 0;
  color: #3182ce;
  font-size: 1rem;
}

.warnings-list,
.recommendations-list {
  margin: 0;
  padding-left: 1.5rem;
}

.warning-item {
  color: #744210;
  margin-bottom: 0.5rem;
}

.recommendation-item {
  color: #2c5282;
  margin-bottom: 0.5rem;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #e9ecef;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 1rem 0;
  color: #6c757d;
  font-size: 1.25rem;
}

.empty-state p {
  color: #6c757d;
  margin-bottom: 2rem;
}

.format-preview {
  text-align: left;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  max-width: 500px;
  margin: 0 auto;
}

.format-preview p {
  margin: 0 0 1rem 0;
  font-weight: 600;
  color: #495057;
}

.format-preview ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #6c757d;
}

.format-preview li {
  margin-bottom: 0.5rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .preview-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .format-tabs {
    justify-content: center;
  }
  
  .action-buttons {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .code-content {
    font-size: 0.75rem;
    padding: 1rem;
  }
  
  .empty-state {
    padding: 2rem 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
}
</style>