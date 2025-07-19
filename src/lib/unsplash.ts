interface UnsplashPhoto {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

class UnsplashService {
  private apiKey: string;
  private baseUrl = 'https://api.unsplash.com';

  constructor() {
    this.apiKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!this.apiKey) {
      throw new Error('Unsplash access key is required');
    }
  }

  // Enhanced stop words to filter out problematic terms
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    'unlocking', 'power', 'secrets', 'ultimate', 'complete', 'guide', 'how', 'why', 'what',
    'when', 'where', 'who', 'which', 'that', 'this', 'these', 'those', 'your', 'our', 'their',
    'future', 'using', 'user', 'people', 'person', 'girl', 'boy', 'man', 'woman'
  ]);

  // Keyword mapping for better search results
  private keywordMapping: Record<string, string[]> = {
    'ai': ['artificial intelligence', 'machine learning', 'technology', 'robots', 'automation'],
    'saas': ['software', 'technology', 'cloud computing', 'business software', 'dashboard'],
    'marketing': ['digital marketing', 'business strategy', 'analytics', 'growth', 'advertising', 'branding'],
    'social': ['social media marketing', 'digital advertising', 'online marketing', 'content strategy'],
    'media': ['digital media', 'content marketing', 'online advertising', 'digital strategy'],
    'productivity': ['workspace', 'office', 'business', 'efficiency', 'tools'],
    'automation': ['technology', 'robots', 'artificial intelligence', 'workflow'],
    'analytics': ['data visualization', 'charts', 'business intelligence', 'dashboard'],
    'growth': ['business growth', 'success', 'strategy', 'upward trend'],
    'startup': ['business', 'entrepreneurship', 'innovation', 'technology'],
    'innovation': ['technology', 'future', 'creative', 'breakthrough'],
    'digital': ['technology', 'computer', 'internet', 'online'],
    'cloud': ['cloud computing', 'technology', 'servers', 'data center'],
    'mobile': ['smartphone', 'technology', 'app development', 'mobile device'],
    'security': ['cybersecurity', 'technology', 'protection', 'shield'],
    'data': ['data visualization', 'analytics', 'database', 'information'],
    'strategy': ['business strategy', 'planning', 'corporate', 'professional'],
    'trends': ['business trends', 'market analysis', 'industry insights', 'statistics'],
    'content': ['content creation', 'digital content', 'creative work', 'publishing'],
    'engagement': ['audience engagement', 'community building', 'interaction', 'connection'],
    'brand': ['branding', 'brand identity', 'corporate identity', 'logo design'],
    'campaign': ['marketing campaign', 'advertising', 'promotion', 'outreach']
  };

  // Context-based query generation
  private generateContextualQuery(title: string): string {
    const lowerTitle = title.toLowerCase();
    
    // AI/ML context
    if (lowerTitle.includes('ai') || lowerTitle.includes('artificial') || lowerTitle.includes('machine learning')) {
      return 'artificial intelligence technology robots';
    }
    
    // SaaS/Software context
    if (lowerTitle.includes('saas') || lowerTitle.includes('software') || lowerTitle.includes('app')) {
      return 'software technology business dashboard';
    }
    
    // Social Media Marketing context
    if (lowerTitle.includes('social media') && lowerTitle.includes('marketing')) {
      return 'digital marketing business strategy advertising';
    }
    
    // General Marketing context
    if (lowerTitle.includes('marketing') || lowerTitle.includes('advertising') || lowerTitle.includes('campaign')) {
      return 'digital marketing business advertising strategy';
    }
    
    // Social Media context (without marketing)
    if (lowerTitle.includes('social media') || lowerTitle.includes('social')) {
      return 'social media marketing digital strategy business';
    }
    
    // Data/Analytics context
    if (lowerTitle.includes('data') || lowerTitle.includes('analytics') || lowerTitle.includes('metrics')) {
      return 'data visualization analytics dashboard';
    }
    
    // Business/Strategy context
    if (lowerTitle.includes('business') || lowerTitle.includes('strategy') || lowerTitle.includes('growth')) {
      return 'business strategy corporate professional';
    }
    
    // Future/Trends context
    if (lowerTitle.includes('future') || lowerTitle.includes('trends') || lowerTitle.includes('2025') || lowerTitle.includes('2024')) {
      return 'business trends technology innovation strategy';
    }
    
    // Default tech context
    return 'technology business innovation';
  }

  private extractKeywords(title: string): string[] {
    // Remove common punctuation and split into words
    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));

    // Expand keywords using mapping
    const expandedKeywords: string[] = [];
    
    words.forEach(word => {
      if (this.keywordMapping[word]) {
        expandedKeywords.push(...this.keywordMapping[word]);
      } else {
        // Only add if it's a meaningful word (not in stop words)
        expandedKeywords.push(word);
      }
    });

    // Remove duplicates and return top keywords
    return [...new Set(expandedKeywords)];
  }

  private buildSearchQuery(title: string): string {
    const keywords = this.extractKeywords(title);
    const contextualQuery = this.generateContextualQuery(title);
    
    // If we have good keywords, use top 2 with OR logic
    if (keywords.length > 0) {
      const topKeywords = keywords.slice(0, 2);
      return topKeywords.join(' OR ');
    }
    
    // Fallback to contextual query
    return contextualQuery;
  }

  async searchPhotos(title: string, perPage: number = 10): Promise<UnsplashPhoto[]> {
    try {
      const query = this.buildSearchQuery(title);
      console.log(`Searching Unsplash for title: "${title}" with query: "${query}"`);
      
      const response = await fetch(
        `${this.baseUrl}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&content_filter=high`,
        {
          headers: {
            'Authorization': `Client-ID ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data: UnsplashSearchResponse = await response.json();
      console.log(`Found ${data.results.length} images for query: "${query}"`);
      return data.results;
    } catch (error) {
      console.error('Error searching Unsplash photos:', error);
      return [];
    }
  }

  async getRandomPhoto(query?: string): Promise<UnsplashPhoto | null> {
    try {
      const searchQuery = query || 'technology business';
      const url = query 
        ? `${this.baseUrl}/photos/random?query=${encodeURIComponent(searchQuery)}&orientation=landscape`
        : `${this.baseUrl}/photos/random?orientation=landscape`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Client-ID ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting random Unsplash photo:', error);
      return null;
    }
  }

  async getPhotoById(id: string): Promise<UnsplashPhoto | null> {
    try {
      const response = await fetch(`${this.baseUrl}/photos/${id}`, {
        headers: {
          'Authorization': `Client-ID ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Unsplash photo by ID:', error);
      return null;
    }
  }

  async findBestImageForTitle(title: string): Promise<{ id: string; url: string; altText: string; user: { name: string; username: string } } | null> {
    try {
      // Try multiple search strategies for better results
      let photos = await this.searchPhotos(title, 8);
      
      if (photos.length === 0) {
        console.log('No photos found with primary search, trying contextual fallback...');
        const contextualQuery = this.generateContextualQuery(title);
        photos = await this.searchPhotos(contextualQuery, 5);
      }
      
      if (photos.length === 0) {
        console.log('No photos found with contextual search, trying random with context...');
        const contextualQuery = this.generateContextualQuery(title);
        const randomPhoto = await this.getRandomPhoto(contextualQuery + ' business professional');
        
        if (randomPhoto) {
          return {
            id: randomPhoto.id,
            url: randomPhoto.urls.regular,
            altText: randomPhoto.alt_description || randomPhoto.description || `Image related to ${title}`,
            user: randomPhoto.user
          };
        }
        
        return null;
      }
      
      // Filter out photos that might be too personal/individual focused
      const filteredPhotos = photos.filter(photo => {
        const description = (photo.alt_description || photo.description || '').toLowerCase();
        const personalKeywords = ['person using', 'girl with', 'boy with', 'man with', 'woman with', 'people using', 'individual'];
        return !personalKeywords.some(keyword => description.includes(keyword));
      });
      
      // Use filtered results if available, otherwise use original
      const photosToUse = filteredPhotos.length > 0 ? filteredPhotos : photos;
      const bestPhoto = photosToUse[0];
      
      console.log(`Selected image: ${bestPhoto.id} - ${bestPhoto.alt_description || bestPhoto.description}`);
      
      return {
        id: bestPhoto.id,
        url: bestPhoto.urls.regular,
        altText: bestPhoto.alt_description || bestPhoto.description || `Image related to ${title}`,
        user: bestPhoto.user
      };
    } catch (error) {
      console.error('Error finding best image for title:', error);
      return null;
    }
  }

  async findBestImageForKeywords(keywords: string): Promise<{ id: string; url: string; altText: string; user: { name: string; username: string } } | null> {
    try {
      console.log(`Searching for image with user-defined keywords: "${keywords}"`);
      
      // Clean and process user keywords
      const cleanKeywords = keywords.trim();
      if (!cleanKeywords) {
        return null;
      }
      
      // Try direct search with user keywords first
      let photos = await this.searchPhotos(cleanKeywords, 8);
      
      if (photos.length === 0) {
        console.log('No photos found with user keywords, trying expanded search...');
        // Try to expand keywords using our mapping
        const expandedQuery = this.expandUserKeywords(cleanKeywords);
        photos = await this.searchPhotos(expandedQuery, 5);
      }
      
      if (photos.length === 0) {
        console.log('No photos found with expanded keywords, trying random...');
        const randomPhoto = await this.getRandomPhoto(cleanKeywords + ' business professional');
        
        if (randomPhoto) {
          return {
            id: randomPhoto.id,
            url: randomPhoto.urls.regular,
            altText: randomPhoto.alt_description || randomPhoto.description || `Image related to ${keywords}`,
            user: randomPhoto.user
          };
        }
        
        return null;
      }
      
      // Filter out personal/individual focused photos
      const filteredPhotos = photos.filter(photo => {
        const description = (photo.alt_description || photo.description || '').toLowerCase();
        const personalKeywords = ['person using', 'girl with', 'boy with', 'man with', 'woman with', 'people using', 'individual'];
        return !personalKeywords.some(keyword => description.includes(keyword));
      });
      
      const photosToUse = filteredPhotos.length > 0 ? filteredPhotos : photos;
      const bestPhoto = photosToUse[0];
      
      console.log(`Selected image from user keywords: ${bestPhoto.id} - ${bestPhoto.alt_description || bestPhoto.description}`);
      
      return {
        id: bestPhoto.id,
        url: bestPhoto.urls.regular,
        altText: bestPhoto.alt_description || bestPhoto.description || `Image related to ${keywords}`,
        user: bestPhoto.user
      };
    } catch (error) {
      console.error('Error finding image for user keywords:', error);
      return null;
    }
  }

  private expandUserKeywords(keywords: string): string {
    const lowerKeywords = keywords.toLowerCase();
    
    // Map user keywords to better search terms
    const keywordExpansions: Record<string, string[]> = {
      'facebook': ['social media marketing', 'digital advertising', 'social network'],
      'instagram': ['social media marketing', 'content creation', 'digital marketing'],
      'twitter': ['social media marketing', 'digital communication', 'online engagement'],
      'linkedin': ['professional networking', 'business marketing', 'corporate social media'],
      'tiktok': ['social media marketing', 'video content', 'digital trends'],
      'youtube': ['video marketing', 'content creation', 'digital media'],
      'ai': ['artificial intelligence', 'machine learning', 'technology', 'automation'],
      'marketing': ['digital marketing', 'business strategy', 'advertising', 'branding'],
      'social media': ['digital marketing', 'online engagement', 'content strategy'],
      'saas': ['software', 'technology', 'cloud computing', 'business software'],
      'technology': ['innovation', 'digital transformation', 'tech solutions'],
      'business': ['corporate', 'professional', 'strategy', 'growth'],
      'startup': ['entrepreneurship', 'innovation', 'business growth'],
      'ecommerce': ['online business', 'digital commerce', 'retail technology'],
      'analytics': ['data visualization', 'business intelligence', 'metrics'],
      'automation': ['technology', 'efficiency', 'digital tools'],
      'productivity': ['efficiency', 'business tools', 'workflow'],
      'growth': ['business growth', 'success', 'strategy', 'scaling']
    };
    
    // Find matching expansions
    const expandedTerms: string[] = [];
    
    Object.keys(keywordExpansions).forEach(key => {
      if (lowerKeywords.includes(key)) {
        expandedTerms.push(...keywordExpansions[key]);
      }
    });
    
    // If we found expansions, use them; otherwise use original keywords
    if (expandedTerms.length > 0) {
      return expandedTerms.slice(0, 3).join(' OR ');
    }
    
    return keywords;
  }
  getAttributionText(image: { user: { name: string; username: string } }): string {
    return `Photo by ${image.user.name} (@${image.user.username}) on Unsplash`;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Unsplash connection...')
      const response = await fetch(`${this.baseUrl}/photos/random`, {
        headers: {
          'Authorization': `Client-ID ${this.apiKey}`,
        },
      })
      console.log('Unsplash connection test result:', response.ok)
      return response.ok
    } catch (error) {
      console.error('Unsplash connection test failed:', error)
      return false
    }
  }
}

export const unsplashService = new UnsplashService();