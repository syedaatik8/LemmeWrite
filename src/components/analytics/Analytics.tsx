import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, TrendingUp, Eye, Users, Clock, Calendar,
  Globe, FileText, Target, Zap, Filter, Download,
  ArrowUp, ArrowDown, Minus, RefreshCw
} from 'lucide-react'
import DashboardLayout from '../layout/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import AnalyticsChart from './AnalyticsChart'
import MetricCard from './MetricCard'
import TopPerformingPosts from './TopPerformingPosts'
import SitePerformance from './SitePerformance'

interface AnalyticsData {
  totalPosts: number
  publishedPosts: number
  pendingPosts: number
  failedPosts: number
  totalWords: number
  avgWordsPerPost: number
  postsThisMonth: number
  postsLastMonth: number
  sitesConnected: number
  activeSchedules: number
}

const Analytics: React.FC = () => {
  const { user, connectedSites } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalPosts: 0,
    publishedPosts: 0,
    pendingPosts: 0,
    failedPosts: 0,
    totalWords: 0,
    avgWordsPerPost: 0,
    postsThisMonth: 0,
    postsLastMonth: 0,
    sitesConnected: 0,
    activeSchedules: 0
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedSite, setSelectedSite] = useState('all')

  useEffect(() => {
    if (user) {
      loadAnalyticsData()
    }
  }, [user, timeRange, selectedSite])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Calculate date ranges
      const now = new Date()
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      
      let dateFilter = new Date()
      switch (timeRange) {
        case '7d':
          dateFilter.setDate(dateFilter.getDate() - 7)
          break
        case '30d':
          dateFilter.setDate(dateFilter.getDate() - 30)
          break
        case '90d':
          dateFilter.setDate(dateFilter.getDate() - 90)
          break
        default:
          dateFilter.setDate(dateFilter.getDate() - 30)
      }

      // Build query with site filter
      let query = supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user?.id)

      if (selectedSite !== 'all') {
        query = query.eq('wordpress_site_id', selectedSite)
      }

      const { data: allPosts, error: postsError } = await query

      if (postsError) throw postsError

      // Calculate metrics
      const totalPosts = allPosts?.length || 0
      const publishedPosts = allPosts?.filter(post => post.status === 'published').length || 0
      const pendingPosts = allPosts?.filter(post => post.status === 'pending').length || 0
      const failedPosts = allPosts?.filter(post => post.status === 'failed').length || 0
      
      // Calculate word counts (estimate based on content length)
      const totalWords = allPosts?.reduce((sum, post) => {
        // Rough estimate: 1 word per 5 characters of content
        const wordCount = Math.floor((post.content?.length || 0) / 5)
        return sum + wordCount
      }, 0) || 0
      
      const avgWordsPerPost = totalPosts > 0 ? Math.floor(totalWords / totalPosts) : 0
      
      // Posts this month vs last month
      const postsThisMonth = allPosts?.filter(post => 
        new Date(post.created_at) >= startOfThisMonth
      ).length || 0
      
      const postsLastMonth = allPosts?.filter(post => 
        new Date(post.created_at) >= startOfLastMonth && 
        new Date(post.created_at) <= endOfLastMonth
      ).length || 0

      // Get active schedules count
      const { data: schedules, error: schedulesError } = await supabase
        .from('post_schedules')
        .select('id')
        .eq('user_id', user?.id)
        .eq('status', 'active')

      if (schedulesError) throw schedulesError

      setAnalyticsData({
        totalPosts,
        publishedPosts,
        pendingPosts,
        failedPosts,
        totalWords,
        avgWordsPerPost,
        postsThisMonth,
        postsLastMonth,
        sitesConnected: connectedSites.length,
        activeSchedules: schedules?.length || 0
      })

    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const growthRate = calculateGrowth(analyticsData.postsThisMonth, analyticsData.postsLastMonth)
  const successRate = analyticsData.totalPosts > 0 
    ? Math.round((analyticsData.publishedPosts / analyticsData.totalPosts) * 100)
    : 0

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-96">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
            <span className="text-gray-600">Loading analytics...</span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Analytics Dashboard</h1>
                <p className="text-gray-600">Track your blog performance and content metrics</p>
              </div>
              <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <button 
                  onClick={loadAnalyticsData}
                  className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Time Range:</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Site:</span>
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                >
                  <option value="all">All Sites</option>
                  {connectedSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Posts"
              value={analyticsData.totalPosts.toString()}
              change={`+${analyticsData.postsThisMonth} this month`}
              icon={FileText}
              color="bg-blue-600"
              trend={growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'neutral'}
            />
            <MetricCard
              title="Published Posts"
              value={analyticsData.publishedPosts.toString()}
              change={`${successRate}% success rate`}
              icon={Target}
              color="bg-green-600"
              trend={successRate >= 80 ? 'up' : successRate >= 60 ? 'neutral' : 'down'}
            />
            <MetricCard
              title="Total Words"
              value={`${(analyticsData.totalWords / 1000).toFixed(1)}k`}
              change={`Avg: ${analyticsData.avgWordsPerPost} words/post`}
              icon={BarChart3}
              color="bg-purple-600"
              trend="up"
            />
            <MetricCard
              title="Active Schedules"
              value={analyticsData.activeSchedules.toString()}
              change={`${analyticsData.sitesConnected} sites connected`}
              icon={Zap}
              color="bg-orange-600"
              trend={analyticsData.activeSchedules > 0 ? 'up' : 'neutral'}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <AnalyticsChart 
              timeRange={timeRange}
              selectedSite={selectedSite}
              userId={user?.id}
            />
            <SitePerformance 
              sites={connectedSites}
              userId={user?.id}
            />
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Post Status Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Post Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Published</span>
                  </div>
                  <span className="font-medium">{analyticsData.publishedPosts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                  <span className="font-medium">{analyticsData.pendingPosts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Failed</span>
                  </div>
                  <span className="font-medium">{analyticsData.failedPosts}</span>
                </div>
              </div>
            </motion.div>

            {/* Growth Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Growth Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">This Month</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{analyticsData.postsThisMonth}</span>
                    {growthRate > 0 && <ArrowUp className="w-4 h-4 text-green-500" />}
                    {growthRate < 0 && <ArrowDown className="w-4 h-4 text-red-500" />}
                    {growthRate === 0 && <Minus className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Month</span>
                  <span className="font-medium">{analyticsData.postsLastMonth}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Growth Rate</span>
                  <span className={`font-medium ${
                    growthRate > 0 ? 'text-green-600' : 
                    growthRate < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {growthRate > 0 ? '+' : ''}{growthRate}%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="font-medium text-green-600">{successRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Words/Post</span>
                  <span className="font-medium">{analyticsData.avgWordsPerPost}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Connected Sites</span>
                  <span className="font-medium">{analyticsData.sitesConnected}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Top Performing Posts */}
          <TopPerformingPosts 
            userId={user?.id}
            selectedSite={selectedSite}
            timeRange={timeRange}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Analytics