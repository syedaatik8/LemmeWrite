// Spinbot API Integration for Content Humanization
// This service handles content rewriting to make AI-generated content more human-like

interface SpinbotResponse {
  success: boolean
  spun_text?: string
  error?: string
}

class SpinbotService {
  private apiKey: string
  private baseUrl = 'http://api.spinbot.net'

  constructor() {
    this.apiKey = '1a5a2c39693f9ef6360a5757819186b7'
    console.log('Spinbot API initialized')
  }

  async humanizeContent(content: string): Promise<{ success: boolean; humanizedContent?: string; error?: string }> {
    try {
      console.log('Humanizing content with Spinbot...')
      console.log('Content length:', content.length)

      // Prepare the request
      const formData = new FormData()
      formData.append('api_key', this.apiKey)
      formData.append('text', content)
      formData.append('format', 'json')

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Spinbot API error: ${response.status} ${response.statusText}`)
      }

      const data: SpinbotResponse = await response.json()
      console.log('Spinbot response:', data)

      if (data.success && data.spun_text) {
        console.log('Content successfully humanized')
        return {
          success: true,
          humanizedContent: data.spun_text
        }
      } else {
        throw new Error(data.error || 'Unknown error from Spinbot')
      }

    } catch (error) {
      console.error('Spinbot humanization error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to humanize content'
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Spinbot connection...')
      const testResult = await this.humanizeContent('This is a test sentence.')
      return testResult.success
    } catch (error) {
      console.error('Spinbot connection test failed:', error)
      return false
    }
  }
}

export const spinbotService = new SpinbotService()