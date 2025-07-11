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

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY
    console.log('OpenAI API Key configured:', this.apiKey ? 'Yes' : 'No')
    console.log('API Key length:', this.apiKey?.length || 0)
  }

  async generateBlogPost(request: BlogGenerationRequest): Promise<BlogGenerationResponse> {
    console.log('=== OpenAI Blog Generation Started ===')
    console.log('Request:', request)
    console.log('API Key available:', !!this.apiKey)

    // Check if API key is available
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn('OpenAI API key is missing. Using fallback content generation.')
      return this.generateFallbackContent(request)
    }

    const prompt = this.buildPrompt(request)
    console.log('Generated prompt:', prompt)
    
    try {
      console.log('Making OpenAI API request...')
      
      const requestBody = {
        model: 'gpt-4o-mini',
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
        response_format: { type: 'json_object' }
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
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('OpenAI Response data:', data)

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI')
      }

      const content = JSON.parse(data.choices[0].message.content)
      console.log('Parsed content:', content)
      
      const result = this.validateAndFormatResponse(content)
      console.log('=== OpenAI Blog Generation Completed Successfully ===')
      return result

    } catch (error) {
      console.error('=== OpenAI Blog Generation Failed ===')
      console.error('Error details:', error)
      
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      
      console.warn('Falling back to template content generation')
      return this.generateFallbackContent(request)
    }
  }

  private generateFallbackContent(request: BlogGenerationRequest): BlogGenerationResponse {
    console.log('=== Using Fallback Content Generation ===')
    const { content, type, wordCount, description } = request
    
    const title = `${this.capitalizeWords(content)}: A Comprehensive Guide`
    const slug = content.toLowerCase().replace(/\s+/g, '-')
    
    const htmlContent = `
      <h2>Introduction</h2>
      <p>Welcome to our comprehensive guide on ${content}. ${description ? description + ' ' : ''}In this article, we'll explore everything you need to know about this ${type === 'topic' ? 'topic' : type === 'category' ? 'category' : 'keyword area'}.</p>
      
      <h2>Understanding ${this.capitalizeWords(content)}</h2>
      <p>${this.capitalizeWords(content)} is an important ${type === 'topic' ? 'subject' : type === 'category' ? 'field' : 'area'} that deserves careful consideration. Let's dive into the key aspects that make it significant.</p>
      
      <h3>Key Benefits</h3>
      <ul>
        <li>Improved understanding and knowledge</li>
        <li>Enhanced practical applications</li>
        <li>Better decision-making capabilities</li>
        <li>Increased efficiency and effectiveness</li>
      </ul>
      
      <h2>Best Practices for ${this.capitalizeWords(content)}</h2>
      <p>When working with ${content}, it's essential to follow established best practices. These guidelines will help you achieve optimal results and avoid common pitfalls.</p>
      
      <h3>Getting Started</h3>
      <p>Begin by understanding the fundamentals of ${content}. This foundation will serve you well as you progress to more advanced concepts and applications.</p>
      
      <h2>Common Challenges and Solutions</h2>
      <p>Like any ${type === 'topic' ? 'subject' : type === 'category' ? 'field' : 'area'}, ${content} comes with its own set of challenges. Here are some common issues and their solutions:</p>
      
      <h3>Challenge 1: Getting Started</h3>
      <p>Many people find it difficult to begin with ${content}. The key is to start small and gradually build your knowledge and skills.</p>
      
      <h3>Challenge 2: Staying Updated</h3>
      <p>The field of ${content} is constantly evolving. Make sure to stay informed about the latest developments and trends.</p>
      
      <h2>Conclusion</h2>
      <p>In conclusion, ${content} is a valuable ${type === 'topic' ? 'topic' : type === 'category' ? 'field' : 'area'} that offers numerous benefits and opportunities. By following the guidelines and best practices outlined in this article, you'll be well-equipped to succeed in your ${content} endeavors.</p>
      
      <p>Remember to continue learning and adapting as you gain more experience with ${content}. The journey of mastering ${content} is ongoing, but the rewards are well worth the effort.</p>
    `
    
    return {
      title,
      content: htmlContent,
      excerpt: `Discover everything you need to know about ${content} in this comprehensive guide. Learn best practices, overcome challenges, and achieve success.`,
      tags: [slug, type, 'guide', 'tips', 'best-practices'],
      metaDescription: `Complete guide to ${content}. Learn key concepts, best practices, and solutions to common challenges. Perfect for beginners and experts alike.`,
      seoKeywords: [content, `${content} guide`, `${content} tips`, `${content} best practices`, `how to ${content}`]
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
    return Math.ceil(wordCount * 1.5) + 500
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