<template>
  <div class="file-upload">
    <div
      class="upload-area"
      :class="{ 
        'drag-active': isDragActive, 
        'has-file': uploadedFile,
        'has-error': uploadError 
      }"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="file-input"
        @change="handleFileSelect"
      />

      <div v-if="isProcessing" class="upload-loading">
        <div class="spinner"></div>
        <p>Processing file...</p>
      </div>

      <div v-else-if="uploadError" class="upload-error">
        <div class="error-icon">⚠️</div>
        <h3>Upload Error</h3>
        <p>{{ uploadError }}</p>
        <button class="retry-button" @click="clearError">Try Again</button>
      </div>

      <div v-else-if="uploadedFile" class="upload-success">
        <div class="success-icon">✅</div>
        <h3>File Loaded Successfully</h3>
        <div class="file-info">
          <p class="file-name">{{ uploadedFile.name }}</p>
          <p class="file-size">{{ formatFileSize(uploadedFile.size) }}</p>
          <p class="file-type">{{ uploadedFile.type || 'application/json' }}</p>
        </div>
        <div class="file-actions">
          <button class="change-file-button" @click="triggerFileInput">
            Change File
          </button>
          <button class="remove-file-button" @click="removeFile">
            Remove
          </button>
        </div>
      </div>

      <div v-else class="upload-prompt">
        <div class="upload-icon">📁</div>
        <h3>Upload AppSettings File</h3>
        <p class="upload-instructions">
          Drop your <code>appsettings.json</code> file here or click to browse
        </p>
        <div class="upload-requirements">
          <p>Requirements:</p>
          <ul>
            <li>JSON format only (.json)</li>
            <li>Maximum size: {{ formatFileSize(maxFileSize) }}</li>
            <li>Valid JSON structure</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="parseResult && !uploadError" class="parse-results">
      <div v-if="parseResult.warnings.length > 0" class="parse-warnings">
        <h4>⚠️ Warnings:</h4>
        <ul>
          <li v-for="warning in parseResult.warnings" :key="warning">
            {{ warning }}
          </li>
        </ul>
      </div>
      
      <div class="parse-stats">
        <div class="stat-item">
          <span class="stat-label">File Size:</span>
          <span class="stat-value">{{ formatFileSize(uploadedFile?.size || 0) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">JSON Valid:</span>
          <span class="stat-value success">✓ Yes</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Structure:</span>
          <span class="stat-value">{{ getStructureDescription() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { validateAppsettingsJson } from '../core/index'
import type { ValidationResult } from '../core/types'

// Props
interface Props {
  disabled?: boolean
  maxFileSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  maxFileSize: 10 * 1024 * 1024 // 10MB default
})

// Emits
const emit = defineEmits<{
  fileLoaded: [content: string, fileName: string]
  fileRemoved: []
  error: [message: string]
}>()

// State
const fileInput = ref<HTMLInputElement>()
const isDragActive = ref(false)
const isProcessing = ref(false)
const uploadedFile = ref<File | null>(null)
const fileContent = ref('')
const uploadError = ref('')
const parseResult = ref<ValidationResult | null>(null)

// Computed
const dragCounter = ref(0)

// Methods
const handleDragEnter = (e: DragEvent) => {
  if (props.disabled) return
  dragCounter.value++
  if (e.dataTransfer?.types.includes('Files')) {
    isDragActive.value = true
  }
}

const handleDragLeave = (e: DragEvent) => {
  if (props.disabled) return
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragActive.value = false
  }
}

const handleDragOver = (e: DragEvent) => {
  if (props.disabled) return
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

const handleDrop = async (e: DragEvent) => {
  if (props.disabled) return
  
  isDragActive.value = false
  dragCounter.value = 0
  
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    await processFile(files[0])
  }
}

const triggerFileInput = () => {
  if (props.disabled || isProcessing.value) return
  fileInput.value?.click()
}

const handleFileSelect = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    await processFile(files[0])
  }
}

const processFile = async (file: File) => {
  // Reset previous state
  uploadError.value = ''
  parseResult.value = null
  
  try {
    // Validate file type
    if (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Please select a JSON file (.json)')
    }
    
    // Validate file size
    if (file.size > props.maxFileSize) {
      throw new Error(`File size must be less than ${formatFileSize(props.maxFileSize)}`)
    }
    
    // Validate file is not empty
    if (file.size === 0) {
      throw new Error('File is empty')
    }
    
    isProcessing.value = true
    
    // Read file content
    const content = await readFileContent(file)
    
    // Validate JSON structure
    const validation = await validateAppsettingsJson(content)
    
    if (validation.isValid) {
      uploadedFile.value = file
      fileContent.value = content
      parseResult.value = validation
      
      emit('fileLoaded', content, file.name)
    } else {
      throw new Error(validation.error || 'Invalid JSON structure')
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process file'
    uploadError.value = errorMessage
    emit('error', errorMessage)
  } finally {
    isProcessing.value = false
  }
}

const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file, 'UTF-8')
  })
}

const removeFile = () => {
  uploadedFile.value = null
  fileContent.value = ''
  uploadError.value = ''
  parseResult.value = null
  
  // Clear the file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  
  emit('fileRemoved')
}

const clearError = () => {
  uploadError.value = ''
  removeFile()
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getStructureDescription = (): string => {
  if (!uploadedFile.value || !parseResult.value) return 'Unknown'
  
  const content = fileContent.value
  try {
    const parsed = JSON.parse(content)
    const keys = Object.keys(parsed)
    const hasArrays = JSON.stringify(parsed).includes('[')
    const hasNested = keys.some(key => typeof parsed[key] === 'object' && parsed[key] !== null)
    
    let description = `${keys.length} top-level properties`
    if (hasNested) description += ', nested objects'
    if (hasArrays) description += ', arrays'
    
    return description
  } catch {
    return 'Invalid structure'
  }
}

// Expose methods for parent component
defineExpose({
  removeFile,
  clearError
})
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.upload-area {
  border: 2px dashed #e9ecef;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafbfc;
  position: relative;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.upload-area.drag-active {
  border-color: #667eea;
  background: #f0f3ff;
  transform: scale(1.02);
}

.upload-area.has-file {
  border-color: #28a745;
  background: #f8fff9;
}

.upload-area.has-error {
  border-color: #dc3545;
  background: #fff8f8;
}

.file-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* Loading state */
.upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
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

/* Upload prompt */
.upload-prompt {
  max-width: 400px;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-prompt h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.upload-instructions {
  color: #6c757d;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

.upload-instructions code {
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
}

.upload-requirements {
  text-align: left;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.upload-requirements p {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: #495057;
}

.upload-requirements ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.upload-requirements li {
  margin-bottom: 0.25rem;
}

/* Success state */
.upload-success {
  max-width: 400px;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-success h3 {
  margin: 0 0 1rem 0;
  color: #28a745;
  font-size: 1.25rem;
}

.file-info {
  background: #f8fff9;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: left;
}

.file-name {
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  word-break: break-all;
}

.file-size,
.file-type {
  color: #6c757d;
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.change-file-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.change-file-button:hover {
  background: #0056b3;
}

.remove-file-button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.remove-file-button:hover {
  background: #545b62;
}

/* Error state */
.upload-error {
  max-width: 400px;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-error h3 {
  margin: 0 0 1rem 0;
  color: #dc3545;
  font-size: 1.25rem;
}

.upload-error p {
  color: #6c757d;
  margin-bottom: 1rem;
}

.retry-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #c82333;
}

/* Parse results */
.parse-results {
  margin-top: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.parse-warnings {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  text-align: left;
}

.parse-warnings h4 {
  margin: 0 0 0.5rem 0;
  color: #856404;
  font-size: 1rem;
}

.parse-warnings ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #856404;
}

.parse-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  text-align: left;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-weight: 500;
  color: #495057;
}

.stat-value {
  font-weight: 600;
  color: #2c3e50;
}

.stat-value.success {
  color: #28a745;
}

/* Responsive */
@media (max-width: 768px) {
  .upload-area {
    padding: 1.5rem;
    min-height: 150px;
  }
  
  .upload-icon,
  .success-icon,
  .error-icon {
    font-size: 2rem;
  }
  
  .file-actions {
    flex-direction: column;
  }
  
  .parse-stats {
    grid-template-columns: 1fr;
  }
  
  .stat-item {
    padding: 0.5rem 0;
    border-bottom: 1px solid #e9ecef;
  }
  
  .stat-item:last-child {
    border-bottom: none;
  }
}
</style>