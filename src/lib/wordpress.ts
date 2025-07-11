// WordPress Integration Service
// Handles all WordPress REST API interactions

interface WordPressSite {
  id: string
  name: string
  url: string
  username: string
  password: string // Application password
}

interface WordPressPost {
  title: string
  content: string
  excerpt: string
  status: 'draft' | 'publish' | 'future'
  tags: string[]
  categories: string[]
  metaDescription?: string
  scheduledDate?: string
}

interface WordPressResponse {
  success: boolean
  postId?: number
  postUrl?: string
  error?: string
}

class WordPressService {
  async publishPost(site: WordPressSite, post: WordPressPost): Promise<WordPressResponse> {
    try {
      console.log('Publishing to WordPress:', { site: site.name, title: post.title })
      
      const auth = btoa(`${site.username}:${site.password}`)
      const apiUrl = `${site.url.replace(/\/$/, '')}/wp-json/wp/v2/posts`

      // First, get or create categories and tags
      const categoryIds = await this.getOrCreateCategories(site, post.categories)
      const tagIds = await this.getOrCreateTags(site, post.tags)

      const postData = {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        status: post.status,
        categories: categoryIds,
        tags: tagIds,
        ...(post.metaDescription && {
          meta: {
            _yoast_wpseo_metadesc: post.metaDescription
          }
        })
      }

      // If scheduled, add date
      if (post.status === 'future' && post.scheduledDate) {
        postData.date = post.scheduledDate
      }

      console.log('Sending post data to WordPress:', postData)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify(postData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('WordPress API error:', errorData)
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('WordPress publish success:', { id: result.id, link: result.link })
      
      return {
        success: true,
        postId: result.id,
        postUrl: result.link
      }
    } catch (error) {
      console.error('WordPress publish error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async testConnection(site: WordPressSite): Promise<boolean> {
    try {
      console.log('Testing WordPress connection:', site.name)
      const auth = btoa(`${site.username}:${site.password}`)
      const apiUrl = `${site.url.replace(/\/$/, '')}/wp-json/wp/v2/users/me`

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      })

      console.log('WordPress connection test result:', response.ok)
      return response.ok
    } catch {
      console.log('WordPress connection test failed')
      return false
    }
  }

  private async getOrCreateCategories(site: WordPressSite, categories: string[]): Promise<number[]> {
    if (!categories.length) return []

    const auth = btoa(`${site.username}:${site.password}`)
    const apiUrl = `${site.url.replace(/\/$/, '')}/wp-json/wp/v2/categories`
    const categoryIds: number[] = []

    for (const categoryName of categories) {
      try {
        // First, try to find existing category
        const searchResponse = await fetch(`${apiUrl}?search=${encodeURIComponent(categoryName)}`, {
          headers: { 'Authorization': `Basic ${auth}` }
        })

        if (searchResponse.ok) {
          const existingCategories = await searchResponse.json()
          const existingCategory = existingCategories.find(
            (cat: any) => cat.name.toLowerCase() === categoryName.toLowerCase()
          )

          if (existingCategory) {
            categoryIds.push(existingCategory.id)
            continue
          }
        }

        // Create new category if not found
        const createResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({ name: categoryName })
        })

        if (createResponse.ok) {
          const newCategory = await createResponse.json()
          categoryIds.push(newCategory.id)
        }
      } catch (error) {
        console.warn(`Failed to handle category "${categoryName}":`, error)
      }
    }

    return categoryIds
  }

  private async getOrCreateTags(site: WordPressSite, tags: string[]): Promise<number[]> {
    if (!tags.length) return []

    const auth = btoa(`${site.username}:${site.password}`)
    const apiUrl = `${site.url.replace(/\/$/, '')}/wp-json/wp/v2/tags`
    const tagIds: number[] = []

    for (const tagName of tags) {
      try {
        // First, try to find existing tag
        const searchResponse = await fetch(`${apiUrl}?search=${encodeURIComponent(tagName)}`, {
          headers: { 'Authorization': `Basic ${auth}` }
        })

        if (searchResponse.ok) {
          const existingTags = await searchResponse.json()
          const existingTag = existingTags.find(
            (tag: any) => tag.name.toLowerCase() === tagName.toLowerCase()
          )

          if (existingTag) {
            tagIds.push(existingTag.id)
            continue
          }
        }

        // Create new tag if not found
        const createResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({ name: tagName })
        })

        if (createResponse.ok) {
          const newTag = await createResponse.json()
          tagIds.push(newTag.id)
        }
      } catch (error) {
        console.warn(`Failed to handle tag "${tagName}":`, error)
      }
    }

    return tagIds
  }
}

export const wordPressService = new WordPressService()
export type { WordPressSite, WordPressPost, WordPressResponse }