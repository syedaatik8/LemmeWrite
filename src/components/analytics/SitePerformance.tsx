import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Globe, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface SiteStats {
  siteId: string
  siteName: string
  siteUrl: string
  totalPosts: number
  publishedPosts: number
  failedPosts: number
  pendingPosts: number
  successRate: number
}

interface SitePerformanceProps {
  sites: Array<{ id: string; name: string; url: string }>
  userId?: string
}

const SitePerformance: React.FC<SitePerformanceProps> = ({ sites, userId }) => {
  const [siteStats, setSiteStats] = useState<SiteStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId && sites.length > 0) {
      loadSiteStats()
    }
  }, [userId, sites])

  const loadSiteStats = async () => {
    try {
      setLoading(true)
      const stats: SiteStats[] = []

      for (const site of sites) {
        const { data: posts, error } = await supabase
          .from('scheduled_posts')
          .select('status')
          .eq('user_id', userId)
          .eq('wordpress_site_id', site.id)

        if (error) throw error

        const totalPosts = posts?.length || 0
        const publishedPosts = posts?.filter(p => p.status === 'published').length || 0
        const failedPosts = posts?.filter(p => p.status === 'failed').length || 0
        const pendingPosts = posts?.filter(p => p.status === 'pending').length || 0
        const successRate = totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0

        stats.push({
          siteId: site.id,
          siteName: site.name,
          siteUrl: site.url,
          totalPosts,
          publishedPosts,
          failedPosts,
          pendingPosts,
          successRate
        })
      }

      setSiteStats(stats)
    } catch (error) {
      console.error('Error loading site stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gray-400">Loading site performance...</div>
        </div>
      </div>
    )
  }

  if (sites.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Site Performance</h3>
        <div className="text-center py-8">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No WordPress sites connected</p>
          <p className="text-sm text-gray-400 mt-1">Connect sites to see performance metrics</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Site Performance</h3>
          <p className="text-sm text-gray-600">Publishing success rates by site</p>
        </div>
        <Globe className="w-5 h-5 text-teal-600" />
      </div>

      <div className="space-y-4">
        {siteStats.map((site) => (
          <div key={site.siteId} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-800">{site.siteName}</h4>
                <p className="text-sm text-gray-500">{site.siteUrl}</p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  site.successRate >= 80 ? 'text-green-600' :
                  site.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {site.successRate}%
                </div>
                <div className="text-xs text-gray-500">Success Rate</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  site.successRate >= 80 ? 'bg-green-500' :
                  site.successRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${site.successRate}%` }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-1 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{site.publishedPosts}</span>
                </div>
                <span className="text-xs text-gray-500">Published</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-1 mb-1">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">{site.pendingPosts}</span>
                </div>
                <span className="text-xs text-gray-500">Pending</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-1 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">{site.failedPosts}</span>
                </div>
                <span className="text-xs text-gray-500">Failed</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default SitePerformance