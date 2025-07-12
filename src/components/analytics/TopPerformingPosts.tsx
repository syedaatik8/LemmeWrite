import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Calendar, Globe, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface PostData {
  id: string
  title: string
  excerpt: string
  status: string
  created_at: string
  published_at?: string
  wordpress_post_id?: number
  wordpress_sites: {
    name: string
    url: string
  }
  tags: string[]
}

interface TopPerformingPostsProps {
  userId?: string
  selectedSite: string
  timeRange: string
}

const TopPerformingPosts: React.FC<TopPerformingPostsProps> = ({
  userId,
  selectedSite,
  timeRange
}) => {
  const [posts, setPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadTopPosts()
    }
  }, [userId, selectedSite, timeRange])

  const loadTopPosts = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const now = new Date()
      let startDate = new Date()
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(startDate.getDate() - 90)
          break
      }

      // Build query
      let query = supabase
        .from('scheduled_posts')
        .select(`
          id,
          title,
          excerpt,
          status,
          created_at,
          published_at,
          wordpress_post_id,
          tags,
          wordpress_sites (
            name,
            url
          )
        `)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      if (selectedSite !== 'all') {
        query = query.eq('wordpress_site_id', selectedSite)
      }

      const { data, error } = await query

      if (error) throw error

      setPosts(data || [])
    } catch (error) {
      console.error('Error loading top posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 bg-white rounded-xl shadow-sm p-6"
      >
        <div className="flex items-center justify-center h-32">
          <div className="animate-pulse text-gray-400">Loading recent posts...</div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="mt-8 bg-white rounded-xl shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Recent Posts</h3>
          <p className="text-sm text-gray-600">Latest blog posts and their status</p>
        </div>
        <FileText className="w-5 h-5 text-teal-600" />
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No posts found for the selected period</p>
          <p className="text-sm text-gray-400 mt-1">Create some blog posts to see them here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 mb-1 line-clamp-1">{post.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {getStatusIcon(post.status)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                    {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span>{post.wordpress_sites.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {post.status === 'published' && post.wordpress_post_id && (
                  <a
                    href={`${post.wordpress_sites.url}/?p=${post.wordpress_post_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-teal-600 hover:text-teal-700"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View Post</span>
                  </a>
                )}
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {post.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{post.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default TopPerformingPosts