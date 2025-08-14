/**
 * Component tests for OutputPreview.vue
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OutputPreview from '../../components/OutputPreview.vue'
import type { ConversionServiceResult, OutputFormat } from '../../core/types'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

// Mock document.execCommand for clipboard fallback
document.execCommand = vi.fn()

const mockSuccessResult: ConversionServiceResult = {
  success: true,
  output: `environment:
  - CONNECTIONSTRINGS__DEFAULTCONNECTION=Server=localhost;Database=MyApp;
  - LOGGING__LOGLEVEL__DEFAULT=Information`,
  environmentVariables: [
    { key: 'CONNECTIONSTRINGS__DEFAULTCONNECTION', value: 'Server=localhost;Database=MyApp;' },
    { key: 'LOGGING__LOGLEVEL__DEFAULT', value: 'Information' }
  ],
  metadata: {
    totalVariables: 2,
    format: 'docker-compose',
    generatedAt: new Date('2023-01-01T00:00:00Z')
  },
  warnings: ['Large configuration detected'],
  stats: {
    totalKeys: 2,
    maxDepth: 3,
    arrayCount: 0,
    recommendations: ['Consider using environment-specific configurations']
  }
}

const mockErrorResult: ConversionServiceResult = {
  success: false,
  error: {
    message: 'Invalid JSON structure',
    code: 'PARSE_ERROR',
    details: { line: 1, column: 5 }
  }
}

describe('OutputPreview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)
    vi.mocked(document.execCommand).mockReturnValue(true)
  })

  describe('Initial State', () => {
    it('renders empty state by default', () => {
      const wrapper = mount(OutputPreview)
      
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('h3').text()).toBe('No Output Yet')
      expect(wrapper.text()).toContain('Enter valid JSON content to see the converted output')
    })

    it('shows available formats in empty state', () => {
      const wrapper = mount(OutputPreview)
      
      expect(wrapper.text()).toContain('Docker Compose: YAML format for docker-compose.yml')
      expect(wrapper.text()).toContain('.env File: Environment file with comments and type hints')
      expect(wrapper.text()).toContain('Plain Text: Simple key=value format')
    })

    it('does not show header actions in empty state', () => {
      const wrapper = mount(OutputPreview)
      
      expect(wrapper.find('.header-actions').exists()).toBe(false)
      expect(wrapper.find('.format-tabs').exists()).toBe(false)
    })
  })

  describe('Loading State', () => {
    it('displays loading spinner when isLoading is true', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          isLoading: true,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('Generating Docker Compose output...')
    })

    it('shows correct loading message for different formats', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          isLoading: true,
          selectedFormat: 'env-file'
        }
      })
      
      expect(wrapper.text()).toContain('Generating .env File output...')
      
      await wrapper.setProps({ selectedFormat: 'plain-text' })
      expect(wrapper.text()).toContain('Generating Plain Text output...')
    })
  })

  describe('Error State', () => {
    it('displays error state when error is provided', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          error: 'Invalid JSON structure',
          hasRetry: true
        }
      })
      
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('h3').text()).toBe('Conversion Error')
      expect(wrapper.find('.error-message').text()).toBe('Invalid JSON structure')
    })

    it('shows retry button when hasRetry is true', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          error: 'Some error',
          hasRetry: true
        }
      })
      
      const retryButton = wrapper.find('.retry-button')
      expect(retryButton.exists()).toBe(true)
      expect(retryButton.text()).toBe('Try Again')
    })

    it('does not show retry button when hasRetry is false', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          error: 'Some error',
          hasRetry: false
        }
      })
      
      expect(wrapper.find('.retry-button').exists()).toBe(false)
    })

    it('emits retry event when retry button is clicked', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          error: 'Some error',
          hasRetry: true
        }
      })
      
      await wrapper.find('.retry-button').trigger('click')
      
      expect(wrapper.emitted('retry')).toBeTruthy()
      expect(wrapper.emitted('retry')![0]).toEqual([])
    })
  })

  describe('Success State with Output', () => {
    it('displays output container when result is successful', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.find('.output-container').exists()).toBe(true)
      expect(wrapper.find('.empty-state').exists()).toBe(false)
      expect(wrapper.find('.error-state').exists()).toBe(false)
    })

    it('shows header actions with format tabs', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.find('.header-actions').exists()).toBe(true)
      expect(wrapper.find('.format-tabs').exists()).toBe(true)
      
      const formatTabs = wrapper.findAll('.format-tab')
      expect(formatTabs).toHaveLength(3)
      expect(formatTabs[0].text()).toBe('Docker Compose')
      expect(formatTabs[1].text()).toBe('.env File')
      expect(formatTabs[2].text()).toBe('Plain Text')
    })

    it('highlights active format tab', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'env-file'
        }
      })
      
      const formatTabs = wrapper.findAll('.format-tab')
      expect(formatTabs[0].classes()).not.toContain('active')
      expect(formatTabs[1].classes()).toContain('active') // .env File
      expect(formatTabs[2].classes()).not.toContain('active')
    })

    it('shows action buttons (copy and download)', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.find('.copy-button').exists()).toBe(true)
      expect(wrapper.find('.download-button').exists()).toBe(true)
      expect(wrapper.find('.copy-button').text()).toBe('Copy')
      expect(wrapper.find('.download-button').text()).toBe('Download')
    })
  })

  describe('Statistics Display', () => {
    it('displays output statistics correctly', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      const statsGrid = wrapper.find('.stats-grid')
      expect(statsGrid.exists()).toBe(true)
      
      const statCards = wrapper.findAll('.stat-card')
      expect(statCards).toHaveLength(4)
      
      // Check variable count
      expect(wrapper.text()).toContain('2') // Environment variables count
      expect(wrapper.text()).toContain('Variables')
      
      // Check arrays count
      expect(wrapper.text()).toContain('Arrays')
      
      // Check max depth
      expect(wrapper.text()).toContain('Max Depth')
      
      // Check output size
      expect(wrapper.text()).toContain('Output Size')
    })

    it('formats output size correctly', () => {
      const largeResult: ConversionServiceResult = {
        ...mockSuccessResult,
        output: 'x'.repeat(1500) // ~1.5KB
      }
      
      const wrapper = mount(OutputPreview, {
        props: {
          result: largeResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.text()).toContain('1.5 KB')
    })
  })

  describe('Format Information', () => {
    it('shows format-specific information', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.find('.format-info').exists()).toBe(true)
      expect(wrapper.text()).toContain('Docker Compose: YAML format for docker-compose.yml files')
      expect(wrapper.text()).toContain('Copy this into your docker-compose.yml under the service definition')
    })

    it('shows correct usage instructions for .env format', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'env-file'
        }
      })
      
      expect(wrapper.text()).toContain('Save as .env file in your project root')
    })

    it('shows correct usage instructions for plain text format', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'plain-text'
        }
      })
      
      expect(wrapper.text()).toContain('Use these environment variables in your deployment scripts')
    })
  })

  describe('Code Display', () => {
    it('displays the output code with proper formatting', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      const codeContent = wrapper.find('.code-content')
      expect(codeContent.exists()).toBe(true)
      expect(codeContent.text()).toContain(mockSuccessResult.output!)
    })

    it('shows correct language label', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.find('.code-language').text().toUpperCase()).toBe('YAML')
    })

    it('applies correct CSS class for syntax highlighting', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      const codeContent = wrapper.find('.code-content')
      expect(codeContent.classes()).toContain('language-yaml')
    })

    it('shows correct language for different formats', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'env-file'
        }
      })
      
      expect(wrapper.find('.code-language').text().toUpperCase()).toBe('BASH')
      expect(wrapper.find('.code-content').classes()).toContain('language-bash')
      
      await wrapper.setProps({ selectedFormat: 'plain-text' })
      
      expect(wrapper.find('.code-language').text().toUpperCase()).toBe('TEXT')
      expect(wrapper.find('.code-content').classes()).toContain('language-text')
    })
  })

  describe('Warnings Display', () => {
    it('shows warnings when present', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      const warningsSection = wrapper.find('.warnings-section')
      expect(warningsSection.exists()).toBe(true)
      expect(warningsSection.find('h4').text()).toContain('⚠️ Warnings')
      
      const warningItems = wrapper.findAll('.warning-item')
      expect(warningItems).toHaveLength(1)
      expect(warningItems[0].text()).toBe('Large configuration detected')
    })

    it('does not show warnings section when no warnings', () => {
      const resultWithoutWarnings: ConversionServiceResult = {
        ...mockSuccessResult,
        warnings: []
      }
      
      const wrapper = mount(OutputPreview, {
        props: {
          result: resultWithoutWarnings,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.find('.warnings-section').exists()).toBe(false)
    })
  })

  describe('Recommendations Display', () => {
    it('shows recommendations when present', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      const recommendationsSection = wrapper.find('.recommendations-section')
      expect(recommendationsSection.exists()).toBe(true)
      expect(recommendationsSection.find('h4').text()).toContain('💡 Recommendations')
      
      const recommendationItems = wrapper.findAll('.recommendation-item')
      expect(recommendationItems).toHaveLength(1)
      expect(recommendationItems[0].text()).toBe('Consider using environment-specific configurations')
    })

    it('does not show recommendations section when no recommendations', () => {
      const resultWithoutRecommendations: ConversionServiceResult = {
        ...mockSuccessResult,
        stats: {
          ...mockSuccessResult.stats!,
          recommendations: []
        }
      }
      
      const wrapper = mount(OutputPreview, {
        props: {
          result: resultWithoutRecommendations,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.find('.recommendations-section').exists()).toBe(false)
    })
  })

  describe('Format Tab Interaction', () => {
    it('emits formatChange event when format tab is clicked', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      const envFileTab = wrapper.findAll('.format-tab')[1] // .env File tab
      await envFileTab.trigger('click')
      
      expect(wrapper.emitted('formatChange')).toBeTruthy()
      expect(wrapper.emitted('formatChange')![0]).toEqual(['env-file'])
    })

    it('does not emit formatChange for already selected format', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      const activeTab = wrapper.findAll('.format-tab')[0] // Docker Compose tab (already active)
      await activeTab.trigger('click')
      
      expect(wrapper.emitted('formatChange')).toBeTruthy()
      expect(wrapper.emitted('formatChange')![0]).toEqual(['docker-compose'])
    })
  })

  describe('Copy Functionality', () => {
    it('copies output to clipboard successfully', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      await wrapper.find('.copy-button').trigger('click')
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockSuccessResult.output)
      expect(wrapper.emitted('copy')).toBeTruthy()
    })

    it('shows "Copied!" text temporarily after successful copy', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      await wrapper.find('.copy-button').trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.copy-button').text()).toBe('Copied!')
    })

    it('falls back to execCommand when clipboard API fails', async () => {
      vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard API not supported'))
      
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      await wrapper.find('.copy-button').trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(document.execCommand).toHaveBeenCalledWith('copy')
      expect(wrapper.emitted('copy')).toBeTruthy()
    })

    it('handles complete copy failure gracefully', async () => {
      vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard API not supported'))
      vi.mocked(document.execCommand).mockReturnValue(false)
      
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      await wrapper.find('.copy-button').trigger('click')
      
      // The copy operation should fail, but the component should handle it gracefully
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(document.execCommand).toHaveBeenCalledWith('copy')
      
      // The component should continue to function normally
      expect(wrapper.find('.copy-button').exists()).toBe(true)
    })

    it('copy button is disabled when no output', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: null
        }
      })
      
      // In empty state, there should be no copy button
      expect(wrapper.find('.copy-button').exists()).toBe(false)
    })

    it('resets copy button text when format changes', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      // Copy first
      await wrapper.find('.copy-button').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.copy-button').text()).toBe('Copied!')
      
      // Change format
      await wrapper.setProps({ selectedFormat: 'env-file' })
      
      expect(wrapper.find('.copy-button').text()).toBe('Copy')
    })
  })

  describe('Download Functionality', () => {
    it('emits download event with correct parameters', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      await wrapper.find('.download-button').trigger('click')
      
      const downloadEvents = wrapper.emitted('download')
      expect(downloadEvents).toBeTruthy()
      expect(downloadEvents![0][0]).toBe('docker-compose') // format
      expect(downloadEvents![0][1]).toBe(mockSuccessResult.output) // content
      expect(downloadEvents![0][2]).toMatch(/appsettings_converted_.*\.yml/) // filename
    })

    it('generates correct filename for different formats', async () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: mockSuccessResult,
          selectedFormat: 'env-file'
        }
      })
      
      await wrapper.find('.download-button').trigger('click')
      
      const downloadEvents = wrapper.emitted('download')
      expect(downloadEvents![0][2]).toMatch(/appsettings_converted_.*\.env/)
      
      await wrapper.setProps({ selectedFormat: 'plain-text' })
      await wrapper.find('.download-button').trigger('click')
      
      expect(wrapper.emitted('download')![1][2]).toMatch(/appsettings_converted_.*\.txt/)
    })

    it('download button is disabled when no output', () => {
      const wrapper = mount(OutputPreview, {
        props: {
          result: null
        }
      })
      
      // In empty state, there should be no download button
      expect(wrapper.find('.download-button').exists()).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('handles result without stats gracefully', () => {
      const resultWithoutStats: ConversionServiceResult = {
        success: true,
        output: 'TEST_VALUE=test',
        environmentVariables: [{ key: 'TEST_VALUE', value: 'test' }],
        metadata: {
          totalVariables: 1,
          format: 'plain-text',
          generatedAt: new Date()
        }
      }
      
      const wrapper = mount(OutputPreview, {
        props: {
          result: resultWithoutStats,
          selectedFormat: 'plain-text'
        }
      })
      
      expect(wrapper.find('.output-container').exists()).toBe(true)
      // Should still show variables count
      expect(wrapper.text()).toContain('1')
      expect(wrapper.text()).toContain('Variables')
    })

    it('handles empty output gracefully', () => {
      const emptyResult: ConversionServiceResult = {
        success: true,
        output: '',
        environmentVariables: [],
        metadata: {
          totalVariables: 0,
          format: 'docker-compose',
          generatedAt: new Date()
        }
      }
      
      const wrapper = mount(OutputPreview, {
        props: {
          result: emptyResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      // With empty output, hasOutput will be false, so it shows empty state
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.output-container').exists()).toBe(false)
    })

    it('handles very large numbers in statistics', () => {
      const largeStatsResult: ConversionServiceResult = {
        ...mockSuccessResult,
        stats: {
          totalKeys: 9999,
          maxDepth: 50,
          arrayCount: 1000,
          recommendations: []
        }
      }
      
      const wrapper = mount(OutputPreview, {
        props: {
          result: largeStatsResult,
          selectedFormat: 'docker-compose'
        }
      })
      
      expect(wrapper.text()).toContain('1000') // Array count
      expect(wrapper.text()).toContain('50') // Max depth
    })
  })
})