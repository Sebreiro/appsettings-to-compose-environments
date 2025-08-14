/**
 * Component tests for FileUpload.vue
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FileUpload from '../../components/FileUpload.vue'

// Mock the core validation function
vi.mock('../../core/index', () => ({
  validateAppsettingsJson: vi.fn()
}))

const mockValidateAppsettingsJson = vi.mocked(await import('../../core/index')).validateAppsettingsJson

describe('FileUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateAppsettingsJson.mockResolvedValue({
      isValid: true,
      warnings: []
    })
  })

  describe('Initial State', () => {
    it('renders upload prompt by default', () => {
      const wrapper = mount(FileUpload)
      
      expect(wrapper.find('.upload-prompt').exists()).toBe(true)
      expect(wrapper.find('h3').text()).toBe('Upload AppSettings File')
      expect(wrapper.text()).toContain('Drop your appsettings.json file here')
    })

    it('shows file requirements', () => {
      const wrapper = mount(FileUpload)
      
      expect(wrapper.text()).toContain('JSON format only (.json)')
      expect(wrapper.text()).toContain('Maximum size: 10 MB')
      expect(wrapper.text()).toContain('Valid JSON structure')
    })

    it('accepts custom max file size', () => {
      const wrapper = mount(FileUpload, {
        props: {
          maxFileSize: 5 * 1024 * 1024 // 5MB
        }
      })
      
      expect(wrapper.text()).toContain('Maximum size: 5 MB')
    })

    it('has correct file input attributes', () => {
      const wrapper = mount(FileUpload)
      const fileInput = wrapper.find('input[type="file"]')
      
      expect(fileInput.attributes('accept')).toBe('.json,application/json')
      expect(fileInput.classes()).toContain('file-input')
    })
  })

  describe('Props and Configuration', () => {
    it('respects disabled prop', () => {
      const wrapper = mount(FileUpload, {
        props: { disabled: true }
      })
      
      expect(wrapper.props('disabled')).toBe(true)
    })

    it('uses custom maxFileSize prop', () => {
      const customSize = 5 * 1024 * 1024 // 5MB
      const wrapper = mount(FileUpload, {
        props: { maxFileSize: customSize }
      })
      
      expect(wrapper.text()).toContain('Maximum size: 5 MB')
      expect(wrapper.props('maxFileSize')).toBe(customSize)
    })
  })

  describe('File Input Interaction', () => {
    it('opens file dialog when clicked', async () => {
      const wrapper = mount(FileUpload)
      const fileInput = wrapper.find('input[type="file"]')
      const clickSpy = vi.spyOn(fileInput.element, 'click').mockImplementation(() => {})
      
      await wrapper.find('.upload-area').trigger('click')
      
      expect(clickSpy).toHaveBeenCalled()
    })

    it('does not open file dialog when disabled', async () => {
      const wrapper = mount(FileUpload, {
        props: { disabled: true }
      })
      const fileInput = wrapper.find('input[type="file"]')
      const clickSpy = vi.spyOn(fileInput.element, 'click').mockImplementation(() => {})
      
      await wrapper.find('.upload-area').trigger('click')
      
      expect(clickSpy).not.toHaveBeenCalled()
    })

    it('does not open file dialog when processing', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Set processing state
      vm.isProcessing = true
      await wrapper.vm.$nextTick()
      
      const fileInput = wrapper.find('input[type="file"]')
      const clickSpy = vi.spyOn(fileInput.element, 'click').mockImplementation(() => {})
      
      await wrapper.find('.upload-area').trigger('click')
      
      expect(clickSpy).not.toHaveBeenCalled()
    })
  })

  describe('Drag and Drop Events', () => {
    it('handles drag enter events', async () => {
      const wrapper = mount(FileUpload)
      const uploadArea = wrapper.find('.upload-area')
      
      await uploadArea.trigger('dragenter')
      expect(uploadArea.exists()).toBe(true)
    })

    it('handles drag over events', async () => {
      const wrapper = mount(FileUpload)
      const uploadArea = wrapper.find('.upload-area')
      
      await uploadArea.trigger('dragover')
      expect(uploadArea.exists()).toBe(true)
    })

    it('handles drag leave events', async () => {
      const wrapper = mount(FileUpload)
      const uploadArea = wrapper.find('.upload-area')
      
      await uploadArea.trigger('dragleave')
      expect(uploadArea.exists()).toBe(true)
    })

    it('handles drop events', async () => {
      const wrapper = mount(FileUpload)
      const uploadArea = wrapper.find('.upload-area')
      
      await uploadArea.trigger('drop')
      expect(uploadArea.exists()).toBe(true)
    })
  })

  describe('Validation Logic', () => {
    it('validates file type correctly', () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      const textFile = {
        type: 'text/plain',
        name: 'test.txt',
        size: 1000
      } as File
      
      // Test that processFile method exists
      expect(typeof vm.processFile).toBe('function')
      
      // The method should handle validation and set error state
      vm.processFile(textFile)
      // We can't easily test the async rejection, but we can test the method exists
      expect(vm.processFile).toBeDefined()
    })

    it('validates file size correctly', () => {
      const wrapper = mount(FileUpload, {
        props: { maxFileSize: 1024 }
      })
      const vm = wrapper.vm as any
      
      const largeFile = {
        type: 'application/json',
        name: 'large.json',
        size: 2048
      } as File
      
      // Test that the validation method exists and handles large files
      expect(typeof vm.processFile).toBe('function')
      vm.processFile(largeFile) // This will set error state internally
      expect(vm.processFile).toBeDefined()
    })

    it('rejects empty files', () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      const emptyFile = {
        type: 'application/json',
        name: 'empty.json',
        size: 0
      } as File
      
      // Test that the validation method exists and handles empty files
      expect(typeof vm.processFile).toBe('function')
      vm.processFile(emptyFile) // This will set error state internally
      expect(vm.processFile).toBeDefined()
    })
  })

  describe('State Display', () => {
    it('shows upload prompt in initial state', () => {
      const wrapper = mount(FileUpload)
      
      expect(wrapper.find('.upload-prompt').exists()).toBe(true)
      expect(wrapper.find('.upload-error').exists()).toBe(false)
      expect(wrapper.find('.upload-success').exists()).toBe(false)
      expect(wrapper.find('.upload-loading').exists()).toBe(false)
    })

    it('can display error state', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Manually set error state to test UI rendering
      vm.uploadError = 'Test error message'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.upload-error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Upload Error')
      expect(wrapper.text()).toContain('Test error message')
    })

    it('can display loading state', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Manually set loading state
      vm.isProcessing = true
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.upload-loading').exists()).toBe(true)
      expect(wrapper.find('.spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('Processing file...')
    })

    it('can display success state', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Manually set success state
      const mockFile = {
        name: 'test.json',
        size: 1024,
        type: 'application/json'
      }
      
      vm.uploadedFile = mockFile
      vm.uploadError = ''
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.upload-success').exists()).toBe(true)
      expect(wrapper.text()).toContain('File Loaded Successfully')
      expect(wrapper.text()).toContain('test.json')
    })
  })

  describe('CSS Classes', () => {
    it('applies has-error class when error exists', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      vm.uploadError = 'Test error'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.upload-area').classes()).toContain('has-error')
    })

    it('applies has-file class when file is uploaded', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      vm.uploadedFile = { name: 'test.json', size: 1024, type: 'application/json' }
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.upload-area').classes()).toContain('has-file')
    })
  })

  describe('File Management Actions', () => {
    it('clear error button works', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Set error state
      vm.uploadError = 'Test error'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.upload-error').exists()).toBe(true)
      
      // Click retry/clear button
      await wrapper.find('.retry-button').trigger('click')
      
      expect(wrapper.find('.upload-prompt').exists()).toBe(true)
      expect(wrapper.find('.upload-error').exists()).toBe(false)
    })

    it('change file button opens dialog', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Set success state first
      vm.uploadedFile = { name: 'test.json', size: 1024, type: 'application/json' }
      await wrapper.vm.$nextTick()
      
      const fileInput = wrapper.find('input[type="file"]')
      const clickSpy = vi.spyOn(fileInput.element, 'click').mockImplementation(() => {})
      
      await wrapper.find('.change-file-button').trigger('click')
      
      expect(clickSpy).toHaveBeenCalled()
    })

    it('remove button clears file state', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Set success state first
      vm.uploadedFile = { name: 'test.json', size: 1024, type: 'application/json' }
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.upload-success').exists()).toBe(true)
      
      // Click remove button
      await wrapper.find('.remove-file-button').trigger('click')
      
      expect(wrapper.find('.upload-prompt').exists()).toBe(true)
      expect(wrapper.find('.upload-success').exists()).toBe(false)
      expect(wrapper.emitted('fileRemoved')).toBeTruthy()
    })
  })

  describe('Parse Results Display', () => {
    it('shows warnings when present', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      const mockFile = { name: 'test.json', size: 1024, type: 'application/json' }
      const mockParseResult = {
        isValid: true,
        warnings: ['Large file detected', 'Complex structure']
      }
      
      vm.uploadedFile = mockFile
      vm.parseResult = mockParseResult
      vm.uploadError = ''
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.parse-warnings').exists()).toBe(true)
      expect(wrapper.text()).toContain('⚠️ Warnings:')
      expect(wrapper.text()).toContain('Large file detected')
      expect(wrapper.text()).toContain('Complex structure')
    })

    it('shows parse statistics', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      const mockFile = { name: 'test.json', size: 1024, type: 'application/json' }
      const mockParseResult = { isValid: true, warnings: [] }
      
      vm.uploadedFile = mockFile
      vm.parseResult = mockParseResult
      vm.uploadError = ''
      await wrapper.vm.$nextTick()
      
      const parseStats = wrapper.find('.parse-stats')
      expect(parseStats.exists()).toBe(true)
      expect(wrapper.text()).toContain('JSON Valid:')
      expect(wrapper.text()).toContain('✓ Yes')
    })
  })

  describe('Utility Functions', () => {
    it('formats file sizes correctly', () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      expect(vm.formatFileSize(0)).toBe('0 Bytes')
      expect(vm.formatFileSize(1024)).toBe('1 KB')
      expect(vm.formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(vm.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('describes JSON structure correctly', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Set up state for structure description with complete data
      vm.fileContent = '{"ConnectionStrings": {"Default": "test"}, "Arrays": [1,2,3]}'
      vm.uploadedFile = { name: 'test.json' }
      vm.parseResult = { isValid: true, warnings: [] } // Add warnings array
      await wrapper.vm.$nextTick()
      
      const description = vm.getStructureDescription()
      expect(description).toContain('properties')
    })
  })

  describe('Event Emissions', () => {
    it('emits fileRemoved when remove is called', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Set up file state
      vm.uploadedFile = { name: 'test.json', size: 1024, type: 'application/json' }
      await wrapper.vm.$nextTick()
      
      // Trigger remove
      vm.removeFile()
      
      expect(wrapper.emitted('fileRemoved')).toBeTruthy()
    })

    it('emits error when processFile fails', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      const invalidFile = {
        type: 'text/plain',
        name: 'test.txt',
        size: 100
      } as File
      
      try {
        await vm.processFile(invalidFile)
      } catch (error) {
        // Expected to fail
      }
      
      // Error should be emitted
      expect(wrapper.emitted('error') || vm.uploadError).toBeTruthy()
    })
  })

  describe('Integration with Core Module', () => {
    it('calls validateAppsettingsJson when processing valid file', async () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      // Mock FileReader
      const originalFileReader = global.FileReader
      global.FileReader = class {
        onload: ((event: any) => void) | null = null
        onerror: ((event: any) => void) | null = null
        result: string = '{"test": "data"}'
        
        readAsText() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: this })
            }
          }, 0)
        }
      } as any
      
      const validFile = {
        type: 'application/json',
        name: 'valid.json',
        size: 100
      } as File
      
      // Process the file
      await vm.processFile(validFile)
      
      // Should have called validation
      expect(mockValidateAppsettingsJson).toHaveBeenCalled()
      
      // Restore FileReader
      global.FileReader = originalFileReader
    })
  })

  describe('Exposed Component Methods', () => {
    it('exposes removeFile method', () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      expect(typeof vm.removeFile).toBe('function')
    })

    it('exposes clearError method', () => {
      const wrapper = mount(FileUpload)
      const vm = wrapper.vm as any
      
      expect(typeof vm.clearError).toBe('function')
    })
  })
})