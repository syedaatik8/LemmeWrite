// Supabase Edge Function to process scheduled posts
// This function runs periodically to check for posts that need to be published

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduledPost {
  id: string
  schedule_id: string
  wordpress_site_id: string
  title: string
  content: string
  excerpt: string
  tags: string[]
  meta_description: string
  seo_keywords: string[]
  scheduled_for: string
  wordpress_sites: {
    name: string
    url: string
    username: string
    password: string
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current time
    const now = new Date().toISOString()

    // Fetch posts that are ready to be published
    const { data: postsToPublish, error: fetchError } = await supabaseClient
      .from('scheduled_posts')
      .select(`
        *,
        wordpress_sites (
          name,
          url,
          username,
          password
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(10) // Process up to 10 posts at a time

    if (fetchError) {
      console.error('Error fetching posts to publish:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch posts' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const results = []

    // Process each post
    for (const post of postsToPublish as ScheduledPost[]) {
      try {
        // Publish to WordPress
        const publishResult = await publishToWordPress(post)
        
        if (publishResult.success) {
          // Update post status to published
          await supabaseClient
            .from('scheduled_posts')
            .update({
              status: 'published',
              published_at: now,
              wordpress_post_id: publishResult.postId
            })
            .eq('id', post.id)

          results.push({
            postId: post.id,
            status: 'published',
            wordpressPostId: publishResult.postId
          })
        } else {
          // Update post status to failed
          await supabaseClient
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: publishResult.error
            })
            .eq('id', post.id)

          results.push({
            postId: post.id,
            status: 'failed',
            error: publishResult.error
          })
        }
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error)
        
        // Update post status to failed
        await supabaseClient
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', post.id)

        results.push({
          postId: post.id,
          status: 'failed',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in process-scheduled-posts function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function publishToWordPress(post: ScheduledPost): Promise<{ success: boolean; postId?: number; error?: string }> {
  try {
    const site = post.wordpress_sites
    const auth = btoa(`${site.username}:${site.password}`)
    const apiUrl = `${site.url.replace(/\/$/, '')}/wp-json/wp/v2/posts`

    // Create categories and tags first (simplified for this example)
    const postData = {
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      status: 'publish',
      meta: {
        _yoast_wpseo_metadesc: post.meta_description
      }
    }

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
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    const result = await response.json()
    
    return {
      success: true,
      postId: result.id
    }
  } catch (error) {
    console.error('WordPress publish error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}