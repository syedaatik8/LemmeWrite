// OpenAI Integration Configuration with Advanced Humanization
// This file handles all OpenAI API interactions for blog generation
import { spinbotService } from './spinbot'

interface BlogGenerationRequest {
  type: 'topic' | 'category' | 'keyword'
  content: string
  description?: string
  imageKeywords?: string
  wordCount: number
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative'
  seoFocus?: boolean
  humanizeContent?: boolean
}

interface BlogGenerationResponse {
  title: string
  content: string
  excerpt: string
  tags: string[]
  metaDescription: string
  seoKeywords: string[]
  featuredImage?: {
    url: string
    altText: string
    attribution: string
  }
}

class OpenAIService {
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1'
  private model = 'gpt-3.5-turbo'

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
    console.log('Humanization requested:', request.humanizeContent)
    
    // Import Unsplash service
    const { unsplashService } = await import('./unsplash')

    // Check if API key is available
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.error('CRITICAL ERROR: OpenAI API key is missing!')
      console.error('Cannot generate blog content without API key.')
      console.error('Please add your OpenAI API key to the .env file as VITE_OPENAI_API_KEY')
      throw new Error('OpenAI API key is required but not configured. Please check your environment variables.')
    }

    const prompt = this.buildAdvancedHumanizationPrompt(request)
    console.log('Generated prompt:', prompt)
    
    try {
      console.log('Making OpenAI API request...')
      
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are Alex, a seasoned web developer and digital marketing expert with 10+ years of real-world experience. You write blog posts that sound completely human, personal, and authentic. Your writing style is conversational, opinionated, and filled with real experiences. You NEVER sound like AI or use corporate language. CRITICAL: You MUST write exactly the requested word count - this is non-negotiable.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.calculateMaxTokens(request.wordCount),
        temperature: 0.8, // Balanced for creativity while maintaining instruction following
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
        content = JSON.parse(data.choices[0].message.content)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response as JSON:', parseError)
        throw new Error('OpenAI returned invalid JSON response format')
      }
      
      const result = this.validateAndFormatResponse(content)
      
      // Apply humanization if requested
      if (request.humanizeContent) {
        console.log('Applying content humanization...')
        try {
          const humanizationResult = await spinbotService.humanizeContent(result.content)
          
          if (humanizationResult.success && humanizationResult.humanizedContent) {
            result.content = humanizationResult.humanizedContent
            console.log('Content successfully humanized')
          } else {
            console.warn('Humanization failed, using original content:', humanizationResult.error)
          }
        } catch (humanizationError) {
          console.warn('Humanization error, using original content:', humanizationError)
        }
      }
      
      // Find and add featured image
      try {
        console.log('Searching for featured image...')
        let featuredImage = null;
        
        // Use user-defined image keywords if provided
        if (request.imageKeywords && request.imageKeywords.trim()) {
          console.log('Using user-defined image keywords:', request.imageKeywords);
          featuredImage = await unsplashService.findBestImageForKeywords(request.imageKeywords);
        }
        
        // Fallback to title-based search if no user keywords or no results
        if (!featuredImage) {
          console.log('Falling back to title-based image search');
          featuredImage = await unsplashService.findBestImageForTitle(result.title);
        }
        
        if (featuredImage) {
          result.featuredImage = {
            url: featuredImage.url,
            altText: featuredImage.altText,
            attribution: unsplashService.getAttributionText(featuredImage)
          }
          console.log('Featured image added:', featuredImage.id)
        } else {
          console.log('No suitable featured image found')
        }
      } catch (imageError) {
        console.warn('Failed to add featured image:', imageError)
      }
      
      console.log('=== OpenAI Blog Generation Completed Successfully ===')
      return result

    } catch (error) {
      console.error('=== OpenAI Blog Generation Failed ===')
      console.error('Error details:', error)
      
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        
        if (error.message.includes('API key') || error.message.includes('quota') || error.message.includes('billing')) {
          throw error
        }
      }
      
      console.error('OpenAI API call failed, throwing error instead of using fallback')
      throw new Error(`Failed to generate content: ${error.message}`)
    }
  }

  private buildAdvancedHumanizationPrompt(request: BlogGenerationRequest): string {
    const basePrompt = `You are Alex, a seasoned web developer and digital marketing expert with 10+ years of experience. Write a blog post that sounds completely human and authentic. 

**CRITICAL MISSION: Make this content pass as 100% human-written, not AI-generated.**

**Content Specifications:**
- **Topic Type**: ${request.type}
- **Focus**: ${request.content}
- **CRITICAL WORD COUNT REQUIREMENT**: Write EXACTLY ${request.wordCount} words. This is mandatory - do not write less!
- **Word Count Verification**: Count your words carefully and ensure you hit the target of ${request.wordCount} words
- **Tone**: Conversational, personal, and authentic
${request.description ? `**Additional Context**: ${request.description}` : ''}

**ADVANCED HUMANIZATION TECHNIQUES:**

**1. NATURAL LANGUAGE PATTERNS:**
- Use imperfect grammar occasionally (like real humans do)
- Include filler words: "I mean", "you know", "basically", "actually"
- Use contractions everywhere: "I'm", "you're", "don't", "can't", "won't"
- Start sentences with "And", "But", "So", "Plus", "Also"
- Use incomplete sentences for emphasis. Like this.

**2. PERSONAL VOICE & AUTHENTICITY:**
- Write in first person with personal experiences
- Include specific, realistic examples from your work
- Share opinions and take sides (don't be neutral)
- Use casual expressions: "pretty cool", "super helpful", "totally worth it"
- Add personal reactions: "This blew my mind", "I was shocked"

**3. CONVERSATIONAL FLOW:**
- Ask direct questions to readers
- Use "you" and "your" extensively  
- Include rhetorical questions: "But here's the thing..."
- Add conversational transitions: "Anyway", "So here's what happened"
- Use parenthetical thoughts (because we all have them)

**4. SENTENCE STRUCTURE VARIETY:**
- Mix very short sentences with longer ones
- Use lists and bullet points naturally
- Include em dashes for natural pauses — like this
- Add ellipses for trailing thoughts...
- Vary paragraph lengths (some 1 line, others 4-5 lines)

**5. WORD CHOICE & EXPRESSIONS:**
- Replace formal words with casual ones:
  - "utilize" → "use"
  - "implement" → "try out" or "do"
  - "furthermore" → "plus" or "also"
  - "in order to" → "to"
- Use colloquialisms: "game-changer", "no-brainer", "piece of cake"
- Include mild exaggerations: "absolutely love", "totally changed"
- Use power words naturally: "discover", "effortless", "proven"

**6. AUTHENTIC IMPERFECTIONS:**
- Occasionally repeat words for emphasis: "really, really important"
- Use redundant phrases sometimes: "free gift", "past history"
- Include self-corrections: "Well, actually..." or "I mean..."
- Add hesitation markers: "Um, so..." or "Let me think..."

**7. ENGAGEMENT TECHNIQUES:**
- Start with a relatable hook or story
- Include calls-to-action throughout (not just at end)
- Reference current events or trends casually
- Ask for reader experiences: "Have you tried this?"
- Use inclusive language: "we", "us", "our community"

**8. CONTENT STRUCTURE:**
- Use subheadings as questions or statements
- Break up text with natural transitions
- Include numbered tips or steps
- Add emphasis with formatting cues
- End sections with cliffhangers

**CONTENT EXPANSION STRATEGIES FOR LONGER POSTS:**

**For 1000+ word posts, include these sections:**
1. **Personal Introduction** (100-150 words): Share your background and why this topic matters
2. **Problem/Challenge Overview** (150-200 words): What issues does this address?
3. **Main Content Sections** (600-800 words): Break into 3-4 detailed sections with:
   - Real examples from your experience
   - Step-by-step processes
   - Common mistakes and solutions
   - Tools and resources
4. **Actionable Tips** (100-150 words): Specific things readers can do today
5. **Conclusion & CTA** (50-100 words): Wrap up and engage readers

**For 1500+ word posts, also add:**
- Case studies or client stories
- Industry trends and predictions
- Comparison of different approaches
- Advanced tips for experienced readers
- Resource lists and tool recommendations

**Word Count Padding Techniques (use naturally):**
- Expand on examples with specific details
- Add personal anecdotes and stories
- Include step-by-step breakdowns
- Provide context and background information
- Add transitional paragraphs between sections
- Include relevant statistics or data points
- Explain the "why" behind each recommendation

**FORBIDDEN AI PHRASES (NEVER USE):**
- "It's important to note"
- "In today's digital landscape"
- "Furthermore" or "Moreover"
- "Additionally" (use "Plus" or "Also")
- "In conclusion" (use "Bottom line" or "Here's the deal")
- "Utilize" (use "use")
- "Implement" (use "try" or "do")

**WRITING STYLE EXAMPLES:**
❌ AI: "It is essential to understand that social media marketing requires strategic planning."
✅ Human: "Look, social media marketing isn't just posting random stuff and hoping for the best."

❌ AI: "This methodology will enhance your productivity significantly."
✅ Human: "I've been using this trick for months, and honestly? It's a total game-changer."

❌ AI: "Furthermore, it is advisable to consider the following factors."
✅ Human: "Plus, here are a few things you definitely want to keep in mind."

**FINAL INSTRUCTIONS:**
- **WORD COUNT IS CRITICAL**: You MUST write exactly ${request.wordCount} words. If you write less, you have failed the task.
- **Content Length Strategy**: For longer word counts (1000+ words), include:
  - Detailed examples and case studies
  - Step-by-step processes
  - Multiple subheadings and sections
  - Personal stories and anecdotes
  - Actionable tips and strategies
  - Common mistakes and how to avoid them
  - Tools and resources recommendations
- Write like you're explaining to a friend over coffee
- Be opinionated and take strong positions
- Include personal anecdotes and real examples
- Use natural speech patterns and casual language
- Make it sound like YOU wrote it, not an AI

Return a JSON object with this structure:
{
  "title": "Conversational, human-like title (under 60 characters)",
  "content": "Full blog post in HTML format that sounds completely human-written",
  "excerpt": "Brief, engaging summary (150-160 characters)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "metaDescription": "SEO meta description (150-160 characters)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

**REMEMBER: This must sound like a real human expert wrote it, not AI. Be authentic, personal, and conversational!**`

    return basePrompt
  }

  private calculateMaxTokens(wordCount: number): number {
    // More generous token calculation for longer content
    // Roughly 1.3 tokens per word + extra buffer for formatting and instructions
    const baseTokens = Math.ceil(wordCount * 1.8) + 800
    return Math.min(baseTokens, 4000) // Increased max tokens
  }

  private validateAndFormatResponse(content: any): BlogGenerationResponse {
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