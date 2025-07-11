// Post Scheduling Service
// Handles all post schedule operations

import { supabase } from './supabase'

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
      const { data, error } = await supabase
        .rpc('create_immediate_post', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_wordpress_site_id: postData.wordpress_site_id,
          p_schedule_type: postData.schedule_type,
          p_content_input: postData.content_input,
          p_description: postData.description || null,
          p_word_count: postData.word_count
        })

      if (error) {
        console.error('Error creating immediate post:', error)
        return { data: null, error }
      }

      // Get the created post
      const { data: post, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('id', data)
        .single()

      if (fetchError) {
        console.error('Error fetching created post:', fetchError)
        return { data: null, error: fetchError }
      }

      return { data: post, error: null }
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

      // This would typically call your OpenAI service to generate content
      // For now, we'll create a placeholder post
      const generatedPost: Omit<ScheduledPost, 'id' | 'created_at' | 'updated_at'> = {
        schedule_id: scheduleId,
        user_id: schedule.user_id,
        wordpress_site_id: schedule.wordpress_site_id,
        title: `Generated Post: ${schedule.content_input}`,
        content: `<h2>Introduction</h2><p>This is a generated blog post about ${schedule.content_input}.</p><h2>Main Content</h2><p>Content will be generated using AI based on your ${schedule.schedule_type}: ${schedule.content_input}</p><h2>Conclusion</h2><p>This concludes our discussion on ${schedule.content_input}.</p>`,
        excerpt: `A comprehensive guide about ${schedule.content_input}`,
        tags: [schedule.content_input.toLowerCase().replace(/\s+/g, '-')],
        meta_description: `Learn everything about ${schedule.content_input} in this comprehensive guide.`,
        seo_keywords: [schedule.content_input],
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
      // This would integrate with your WordPress publishing service
      // For now, we'll just update the status
      const { error } = await supabase
        .from('scheduled_posts')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', postId)

      return { error }
    } catch (err) {
      console.error('Error publishing post:', err)
      return { error: err }
    }
  }
}

export const scheduleService = new ScheduleService()