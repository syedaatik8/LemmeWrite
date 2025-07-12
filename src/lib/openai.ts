// OpenAI Integration Configuration
// This file handles all OpenAI API interactions for blog generation

interface BlogGenerationRequest {
  type: 'topic' | 'category' | 'keyword'
  content: string
  description?: string
  wordCount: number
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative'
  seoFocus?: boolean
}

interface BlogGenerationResponse {
  title: string
  content: string
  excerpt: string
  tags: string[]
  metaDescription: string
  seoKeywords: string[]
}

class OpenAIService {
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1'
  private model = 'gpt-3.5-turbo' // Using cheaper model for testing
  // Alternative models:
  // 'gpt-3.5-turbo' - Cheapest option, good for testing
  // 'gpt-4o-mini' - Better quality, still affordable
  // 'gpt-4' - Best quality, most expensive

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.error('CRITICAL: OpenAI API key is missing or empty!')
      console.error('Please check your .env file and ensure VITE_OPENAI_API_KEY is set correctly')
    } else {
      console.log('OpenAI API Key configured successfully')
      console.log('API Key prefix:', this.apiKey.substring(0, 20) + '...')
    }
  }

  async generateBlogPost(request: BlogGenerationRequest): Promise<BlogGenerationResponse> {
    console.log('=== OpenAI Blog Generation Started ===')
    console.log('Request:', request)
    console.log('API Key available:', !!this.apiKey)

    // Check if API key is available
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.error('CRITICAL ERROR: OpenAI API key is missing!')
      console.error('Cannot generate blog content without API key.')
      console.error('Please add your OpenAI API key to the .env file as VITE_OPENAI_API_KEY')
      throw new Error('OpenAI API key is required but not configured. Please check your environment variables.')
    }

    const prompt = this.buildPrompt(request)
    console.log('Generated prompt:', prompt)
    
    try {
      console.log('Making OpenAI API request...')
      
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional blog writer and SEO expert. Create high-quality, engaging blog posts that are optimized for search engines and provide real value to readers. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.calculateMaxTokens(request.wordCount),
        temperature: 0.7,
      }

      console.log('Request body:', JSON.stringify(requestBody, null, 2))

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      console.log('OpenAI Response status:', response.status)
      console.log('OpenAI Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API Error Response:', errorText)
        
        // Try to parse error for better handling
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.error?.code === 'insufficient_quota') {
            throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing.')
          } else if (errorData.error?.code === 'invalid_api_key') {
            throw new Error('Invalid OpenAI API key. Please check your API key configuration.')
          }
        } catch (parseError) {
          // If we can't parse the error, use the original
        }
        
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('OpenAI Response data:', data)

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI')
      }

      // Parse the response content
      let content
      try {
        // Try to parse as JSON first
        content = JSON.parse(data.choices[0].message.content)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response as JSON:', parseError)
        throw new Error('OpenAI returned invalid JSON response format')
      }
      
      const result = this.validateAndFormatResponse(content)
      console.log('=== OpenAI Blog Generation Completed Successfully ===')
      return result

    } catch (error) {
      console.error('=== OpenAI Blog Generation Failed ===')
      console.error('Error details:', error)
      
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        
        // Don't fall back to template content - throw the actual error
        if (error.message.includes('API key') || error.message.includes('quota') || error.message.includes('billing')) {
          throw error
        }
      }
      
      // Only fall back for network errors, not API key issues
      console.error('OpenAI API call failed, throwing error instead of using fallback')
      throw new Error(`Failed to generate content: ${error.message}`)
    }
  }

  private capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, l => l.toUpperCase())
  }

  private buildPrompt(request: BlogGenerationRequest): string {
    const basePrompt = `Generate a comprehensive blog post with the following specifications:

**Content Type**: ${request.type}
**Focus**: ${request.content}
**Word Count**: Approximately ${request.wordCount} words
**Tone**: ${request.tone || 'professional'}
**SEO Optimized**: ${request.seoFocus !== false ? 'Yes' : 'No'}
${request.description ? `**Additional Context**: ${request.description}` : ''}

Please return a JSON object with the following structure:
{
  "title": "Compelling, SEO-optimized title (60 characters or less)",
  "content": "Full blog post content in HTML format with proper headings, paragraphs, and structure",
  "excerpt": "Brief summary (150-160 characters)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "metaDescription": "SEO meta description (150-160 characters)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

**Content Requirements**:
- Use proper HTML structure with h2, h3 headings
- Include engaging introduction and conclusion
- Add relevant subheadings for better readability
- Include actionable insights and practical tips
- Optimize for featured snippets when possible
- Use natural keyword integration
- Include internal linking suggestions (as comments in HTML)
- Make it engaging and valuable for readers

**SEO Best Practices**:
- Target long-tail keywords naturally
- Use semantic keywords and related terms
- Structure content for readability
- Include FAQ section if relevant
- Optimize for user intent`

    return basePrompt
  }

  private calculateMaxTokens(wordCount: number): number {
    // Rough estimation: 1 word ≈ 1.3 tokens
    // Add extra tokens for JSON structure and formatting
    // Reduced max tokens for gpt-3.5-turbo (has 4096 token limit)
    const baseTokens = Math.ceil(wordCount * 1.5) + 500
    return Math.min(baseTokens, 3500) // Leave room for input tokens
  }

  private validateAndFormatResponse(content: any): BlogGenerationResponse {
    // Validate required fields
    if (!content.title || !content.content || !content.excerpt) {
      throw new Error('Invalid response format from OpenAI')
    }

    return {
      title: content.title,
      content: content.content,
      excerpt: content.excerpt,
      tags: Array.isArray(content.tags) ? content.tags : [],
      metaDescription: content.metaDescription || content.excerpt,
      seoKeywords: Array.isArray(content.seoKeywords) ? content.seoKeywords : []
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing OpenAI connection...')
      console.log('Using model:', this.model)
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      console.log('OpenAI connection test result:', response.ok)
      return response.ok
    } catch (error) {
      console.error('OpenAI connection test failed:', error)
      return false
    }
  }
}

export const openAIService = new OpenAIService()
export type { BlogGenerationRequest, BlogGenerationResponse }