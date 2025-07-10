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
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured')
    }
  }

  async generateBlogPost(request: BlogGenerationRequest): Promise<BlogGenerationResponse> {
    const prompt = this.buildPrompt(request)
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using the most cost-effective model
          messages: [
            {
              role: 'system',
              content: 'You are a professional blog writer and SEO expert. Create high-quality, engaging blog posts that are optimized for search engines and provide real value to readers.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.calculateMaxTokens(request.wordCount),
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const content = JSON.parse(data.choices[0].message.content)
      
      return this.validateAndFormatResponse(content)
    } catch (error) {
      console.error('Error generating blog post:', error)
      throw new Error('Failed to generate blog post. Please try again.')
    }
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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export const openAIService = new OpenAIService()
export type { BlogGenerationRequest, BlogGenerationResponse }