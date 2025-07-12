// Unsplash API Integration
// Handles image search and selection for blog featured images

interface UnsplashImage {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  alt_description: string | null
  description: string | null
  user: {
    name: string
    username: string
  }
  links: {
    download_location: string
  }
  width: number
  height: number
}

interface UnsplashSearchResponse {
  total: number
  total_pages: number
  results: UnsplashImage[]
}

interface ImageSearchResult {
  id: string
  url: string
  altText: string
  description: string
  photographer: string
  downloadLocation: string
  width: number
  height: number
}

class UnsplashService {
  private accessKey: string
  private baseUrl = 'https://api.unsplash.com'

  constructor() {
    this.accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
    if (!this.accessKey || this.accessKey.trim() === '') {
      console.error('CRITICAL: Unsplash Access Key is missing!')
      console.error('Please check your .env file and ensure VITE_UNSPLASH_ACCESS_KEY is set correctly')
    } else {
      console.log('Unsplash API Key configured successfully')
    }
  }

  /**
   * Extract keywords from blog title for image search
   */
  extractKeywords(title: string): string[] {
    // Remove common words and extract meaningful keywords
    const commonWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'how', 'what', 'why', 'when', 'where', 'who', 'which', 'that', 'this', 'these', 'those',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
      'top', 'best', 'guide', 'review', 'comprehensive', 'ultimate', 'complete'
    ]

    // Remove years, numbers, and dates
    const yearPattern = /\b(19|20)\d{2}\b/g
    const numberPattern = /\b\d+\b/g
    
    const words = title
      .toLowerCase()
      .replace(yearPattern, '') // Remove years like 2024, 2025
      .replace(numberPattern, '') // Remove standalone numbers
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .slice(0, 4) // Take top 4 keywords for better focus

    return words
  }

  /**
   * Search for images on Unsplash
   */
  async searchImages(query: string, perPage: number = 10): Promise<ImageSearchResult[]> {
    if (!this.accessKey) {
      throw new Error('Unsplash Access Key is not configured')
    }

    try {
      console.log('Searching Unsplash for:', query)
      
      const response = await fetch(
        `${this.baseUrl}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${this.accessKey}`,
            'Accept-Version': 'v1'
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Unsplash API Error:', response.status, errorText)
        throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`)
      }

      const data: UnsplashSearchResponse = await response.json()
      console.log(`Found ${data.results.length} images for query: ${query}`)

      return data.results.map(image => ({
        id: image.id,
        url: image.urls.regular,
        altText: image.alt_description || image.description || `Photo by ${image.user.name}`,
        description: image.description || image.alt_description || '',
        photographer: image.user.name,
        downloadLocation: image.links.download_location,
        width: image.width,
        height: image.height
      }))
    } catch (error) {
      console.error('Error searching Unsplash:', error)
      throw error
    }
  }

  /**
   * Find the best image for a blog title
   */
  async findBestImageForTitle(title: string): Promise<ImageSearchResult | null> {
    try {
      // Extract keywords from title
      const keywords = this.extractKeywords(title)
      console.log('Extracted keywords from title:', keywords)

      if (keywords.length === 0) {
        console.warn('No keywords extracted from title, using generic search')
        keywords.push('business', 'technology')
      }

      // Try searching with different keyword combinations
      const searchQueries = [
        keywords.join(' '), // All keywords together
        keywords.slice(0, 3).join(' '), // Top 3 keywords
        keywords[0], // Primary keyword only
        'business technology' // Fallback
      ]

      for (const query of searchQueries) {
        try {
          const images = await this.searchImages(query, 5)
          if (images.length > 0) {
            // Return the first (most relevant) image
            const selectedImage = images[0]
            console.log(`Selected image: ${selectedImage.id} by ${selectedImage.photographer}`)
            
            // Track download for Unsplash API requirements
            await this.trackDownload(selectedImage.downloadLocation)
            
            return selectedImage
          }
        } catch (error) {
          console.warn(`Search failed for query "${query}":`, error)
          continue
        }
      }

      console.warn('No images found for any search query')
      return null
    } catch (error) {
      console.error('Error finding best image for title:', error)
      return null
    }
  }

  /**
   * Track image download (required by Unsplash API)
   */
  private async trackDownload(downloadLocation: string): Promise<void> {
    try {
      await fetch(downloadLocation, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`
        }
      })
    } catch (error) {
      console.warn('Failed to track download:', error)
      // Don't throw error as this is not critical
    }
  }

  /**
   * Test connection to Unsplash API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Unsplash connection...')
      const response = await fetch(`${this.baseUrl}/photos?per_page=1`, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1'
        }
      })
      console.log('Unsplash connection test result:', response.ok)
      return response.ok
    } catch (error) {
      console.error('Unsplash connection test failed:', error)
      return false
    }
  }

  /**
   * Get image attribution text for Unsplash requirements
   */
  getAttributionText(image: ImageSearchResult): string {
    return `Photo by ${image.photographer} on Unsplash`
  }

  /**
   * Generate HTML for image with proper attribution
   */
  generateImageHtml(image: ImageSearchResult, title: string): string {
    const attribution = this.getAttributionText(image)
    return `<img src="${image.url}" alt="${image.altText || title}" title="${attribution}" style="width: 100%; height: auto; margin: 20px 0;" />`
  }
}

export const unsplashService = new UnsplashService()
export type { ImageSearchResult }