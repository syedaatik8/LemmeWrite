// Post Scheduling Service
// Handles all post schedule operations

import { supabase } from './supabase'
import { openAIService } from './openai'
import { wordPressService } from './wordpress'

export interface PostSchedule {
  id?: string
  user_id?: string
  wordpress_site_id: string
  schedule_type: 'topic' | 'category' | 'keyword'
  content_input: string
  description?: string
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  word_count: number
  publish_time: string
  status?: 'active' | 'paused' | 'completed'
  next_post_date?: string
  posts_generated?: number
  created_at?: string
  updated_at?: string
}

export interface ScheduledPost {
  id?: string
  schedule_id: string
  user_id?: string
  wordpress_site_id: string
  title: string
  content: string
  excerpt: string
  tags: string[]
  meta_description?: string
  seo_keywords: string[]
  status: 'pending' | 'published' | 'failed' | 'draft'
  scheduled_for: string
  published_at?: string
  wordpress_post_id?: number
  error_message?: string
  created_at?: string
  updated_at?: string
}

export interface ImmediatePostRequest {
  wordpress_site_id: string
  schedule_type: 'topic' | 'category' | 'keyword'
  content_input: string
  description?: string
  word_count: number
}

class ScheduleService {
  async createSchedule(scheduleData: PostSchedule): Promise<{ data: PostSchedule | null, error: any }> {
    try {
      // Calculate the next post date
      const { data: nextPostDate, error: dateError } = await supabase
        .rpc('calculate_next_post_date', {
          frequency_type: scheduleData.frequency,
          publish_time: scheduleData.publish_time
        })

      if (dateError) {
        console.error('Error calculating next post date:', dateError)
        return { data: null, error: dateError }
      }

      // Create the schedule
      const { data, error } = await supabase
        .from('post_schedules')
        .insert([{
          ...scheduleData,
          next_post_date: nextPostDate
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating schedule:', error)
        return { data: null, error }
      }

      // Generate the first post immediately
      await this.generatePostForSchedule(data.id)

      return { data, error: null }
    } catch (err) {
      console.error('Error in createSchedule:', err)
      return { data: null, error: err }
    }
  }

  async createImmediatePost(postData: ImmediatePostRequest): Promise<{ data: ScheduledPost | null, error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: 'User not authenticated' }
      }

      // Get WordPress site details
      const { data: wpSite, error: siteError } = await supabase
        .from('wordpress_sites')
        .select('*')
        .eq('id', postData.wordpress_site_id)
        .eq('user_id', user.id)
        .single()

      if (siteError || !wpSite) {
        return { data: null, error: 'WordPress site not found or not accessible' }
      }

      // Generate content using OpenAI
      console.log('Generating content with OpenAI...')
      const blogContent = await openAIService.generateBlogPost({
        type: postData.schedule_type,
        content: postData.content_input,
        description: postData.description,
        wordCount: postData.word_count,
        tone: 'professional',
        seoFocus: true
      })

      // Create the scheduled post record
      const { data: scheduledPost, error: insertError } = await supabase
        .from('scheduled_posts')
        .insert([{
          user_id: user.id,
          wordpress_site_id: postData.wordpress_site_id,
          title: blogContent.title,
          content: blogContent.content,
          excerpt: blogContent.excerpt,
          tags: blogContent.tags,
          meta_description: blogContent.metaDescription,
          seo_keywords: blogContent.seoKeywords,
          status: 'pending',
          scheduled_for: new Date().toISOString()
        }])
        .select()
        .single()

      if (insertError) {
        console.error('Error creating scheduled post:', insertError)
        return { data: null, error: insertError }
      }

      // Immediately attempt to publish to WordPress
      try {
        console.log('Publishing to WordPress...')
        const publishResult = await wordPressService.publishPost(
          {
            id: wpSite.id,
            name: wpSite.name,
            url: wpSite.url,
            username: wpSite.username,
            password: wpSite.password
          },
          {
            title: blogContent.title,
            content: blogContent.content,
            excerpt: blogContent.excerpt,
            status: 'publish',
            tags: blogContent.tags,
            categories: [], // You can add category logic here
            metaDescription: blogContent.metaDescription,
            featuredImage: blogContent.featuredImage
          }
        )

        if (publishResult.success) {
          // Update the post status to published
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              wordpress_post_id: publishResult.postId
            })
            .eq('id', scheduledPost.id)

          return { 
            data: { 
              ...scheduledPost, 
              status: 'published',
              wordpress_post_id: publishResult.postId 
            }, 
            error: null 
          }
        } else {
          // Update the post status to failed
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: publishResult.error
            })
            .eq('id', scheduledPost.id)

          return { 
            data: { 
              ...scheduledPost, 
              status: 'failed',
              error_message: publishResult.error 
            }, 
            error: publishResult.error 
          }
        }
      } catch (publishError) {
        console.error('Error publishing to WordPress:', publishError)
        
        // Update the post status to failed
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: publishError.message
          })
          .eq('id', scheduledPost.id)

        return { 
          data: { 
            ...scheduledPost, 
            status: 'failed',
            error_message: publishError.message 
          }, 
          error: publishError.message 
        }
      }
    } catch (err) {
      console.error('Error in createImmediatePost:', err)
      return { data: null, error: err }
    }
  }

  async getUserSchedules(userId: string): Promise<{ data: PostSchedule[] | null, error: any }> {
    try {
      const { data, error } = await supabase
        .from('post_schedules')
        .select(`
          *,
          wordpress_sites (
            name,
            url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (err) {
      console.error('Error fetching user schedules:', err)
      return { data: null, error: err }
    }
  }

  async updateScheduleStatus(scheduleId: string, status: 'active' | 'paused' | 'completed'): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('post_schedules')
        .update({ status })
        .eq('id', scheduleId)

      return { error }
    } catch (err) {
      console.error('Error updating schedule status:', err)
      return { error: err }
    }
  }

  async deleteSchedule(scheduleId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('post_schedules')
        .delete()
        .eq('id', scheduleId)

      return { error }
    } catch (err) {
      console.error('Error deleting schedule:', err)
      return { error: err }
    }
  }

  async generatePostForSchedule(scheduleId: string): Promise<{ data: ScheduledPost | null, error: any }> {
    try {
      // Get schedule details
      const { data: schedule, error: scheduleError } = await supabase
        .from('post_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single()

      if (scheduleError || !schedule) {
        return { data: null, error: scheduleError || 'Schedule not found' }
      }

      // Generate content using OpenAI
      console.log('Generating content for schedule:', scheduleId)
      const blogContent = await openAIService.generateBlogPost({
        type: schedule.schedule_type,
        content: schedule.content_input,
        description: schedule.description,
        wordCount: schedule.word_count,
        tone: 'professional',
        seoFocus: true
      })

      const generatedPost: Omit<ScheduledPost, 'id' | 'created_at' | 'updated_at'> = {
        schedule_id: scheduleId,
        user_id: schedule.user_id,
        wordpress_site_id: schedule.wordpress_site_id,
        title: blogContent.title,
        content: blogContent.content,
        excerpt: blogContent.excerpt,
        tags: blogContent.tags,
        meta_description: blogContent.metaDescription,
        seo_keywords: blogContent.seoKeywords,
        status: 'pending',
        scheduled_for: schedule.next_post_date || new Date().toISOString()
      }

      // Save the generated post
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert([generatedPost])
        .select()
        .single()

      if (error) {
        console.error('Error saving generated post:', error)
        return { data: null, error }
      }

      // Update the schedule's next post date
      await supabase.rpc('update_next_post_date', { schedule_id: scheduleId })

      return { data, error: null }
    } catch (err) {
      console.error('Error generating post for schedule:', err)
      return { data: null, error: err }
    }
  }

  async getScheduledPosts(userId: string): Promise<{ data: ScheduledPost[] | null, error: any }> {
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          post_schedules (
            schedule_type,
            content_input,
            frequency
          ),
          wordpress_sites (
            name,
            url
          )
        `)
        .eq('user_id', userId)
        .order('scheduled_for', { ascending: true })

      return { data, error }
    } catch (err) {
      console.error('Error fetching scheduled posts:', err)
      return { data: null, error: err }
    }
  }

  async publishPost(postId: string): Promise<{ error: any }> {
    try {
      // Get the post details
      const { data: post, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          wordpress_sites (
            id,
            name,
            url,
            username,
            password
          )
        `)
        .eq('id', postId)
        .single()

      if (fetchError || !post) {
        return { error: fetchError || 'Post not found' }
      }

      // Publish to WordPress
      const publishResult = await wordPressService.publishPost(
        {
          id: post.wordpress_sites.id,
          name: post.wordpress_sites.name,
          url: post.wordpress_sites.url,
          username: post.wordpress_sites.username,
          password: post.wordpress_sites.password
        },
        {
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          status: 'publish',
          tags: post.tags,
          categories: [],
          metaDescription: post.meta_description,
          featuredImage: undefined // Featured image would be embedded in content already
        }
      )

      if (publishResult.success) {
        // Update post status to published
        const { error } = await supabase
          .from('scheduled_posts')
          .update({ 
            status: 'published',
            published_at: new Date().toISOString(),
            wordpress_post_id: publishResult.postId
          })
          .eq('id', postId)

        return { error }
      } else {
        // Update post status to failed
        const { error } = await supabase
          .from('scheduled_posts')
          .update({ 
            status: 'failed',
            error_message: publishResult.error
          })
          .eq('id', postId)

        return { error: publishResult.error }
      }

    } catch (err) {
      console.error('Error publishing post:', err)
      return { error: err }
    }
  }
}

export const scheduleService = new ScheduleService()
export type PostScheduleType = PostSchedule