import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ChartData {
  date: string
  posts: number
  published: number
  failed: number
}

interface AnalyticsChartProps {
  timeRange: string
  selectedSite: string
  userId?: string
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  timeRange,
  selectedSite,
  userId
}) => {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadChartData()
    }
  }, [userId, timeRange, selectedSite])

  const loadChartData = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const now = new Date()
      let startDate = new Date()
      let days = 30
      
      switch (timeRange) {
        case '7d':
          days = 7
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          days = 30
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90d':
          days = 90
          startDate.setDate(startDate.getDate() - 90)
          break
      }

      // Build query
      let query = supabase
        .from('scheduled_posts')
        .select('created_at, status')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())

      if (selectedSite !== 'all') {
        query = query.eq('wordpress_site_id', selectedSite)
      }

      const { data: posts, error } = await query

      if (error) throw error

      // Group posts by date
      const groupedData: { [key: string]: ChartData } = {}
      
      // Initialize all dates with zero values
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (days - 1 - i))
        const dateStr = date.toISOString().split('T')[0]
        groupedData[dateStr] = {
          date: dateStr,
          posts: 0,
          published: 0,
          failed: 0
        }
      }

      // Fill in actual data
      posts?.forEach(post => {
        const dateStr = post.created_at.split('T')[0]
        if (groupedData[dateStr]) {
          groupedData[dateStr].posts++
          if (post.status === 'published') {
            groupedData[dateStr].published++
          } else if (post.status === 'failed') {
            groupedData[dateStr].failed++
          }
        }
      })

      setChartData(Object.values(groupedData))
    } catch (error) {
      console.error('Error loading chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  const maxPosts = Math.max(...chartData.map(d => d.posts), 1)

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Posts Over Time</h3>
          <p className="text-sm text-gray-600">Daily post creation and publishing activity</p>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-teal-600" />
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
      </div>

      <div className="h-64 flex items-end justify-between space-x-1">
        {chartData.map((data, index) => (
          <div key={data.date} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col justify-end h-48 space-y-1">
              {/* Published posts bar */}
              <div
                className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                style={{
                  height: `${(data.published / maxPosts) * 100}%`,
                  minHeight: data.published > 0 ? '4px' : '0px'
                }}
                title={`Published: ${data.published}`}
              />
              {/* Failed posts bar */}
              <div
                className="w-full bg-red-500 transition-all duration-300 hover:bg-red-600"
                style={{
                  height: `${(data.failed / maxPosts) * 100}%`,
                  minHeight: data.failed > 0 ? '4px' : '0px'
                }}
                title={`Failed: ${data.failed}`}
              />
              {/* Pending posts bar */}
              <div
                className="w-full bg-yellow-500 transition-all duration-300 hover:bg-yellow-600"
                style={{
                  height: `${((data.posts - data.published - data.failed) / maxPosts) * 100}%`,
                  minHeight: (data.posts - data.published - data.failed) > 0 ? '4px' : '0px'
                }}
                title={`Pending: ${data.posts - data.published - data.failed}`}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              {new Date(data.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-600">Published</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-sm text-gray-600">Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-600">Failed</span>
        </div>
      </div>
    </motion.div>
  )
}

export default AnalyticsChart