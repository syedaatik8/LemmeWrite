import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, Users, DollarSign, TrendingUp, Calendar, FileText,
  Settings, Plus, Filter, Activity, Target, Zap, Globe, MessageCircle,
  ChevronDown, X, AlertCircle, CheckCircle, Clock, Edit
} from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layout/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import PricingModal from '../pricing/PricingModal'

const Dashboard: React.FC = () => {
  const { connectedSites, user, userPoints } = useAuth()
  const [showPopup, setShowPopup] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [postsThisMonth, setPostsThisMonth] = useState(0)
  const [scheduledPosts, setScheduledPosts] = useState(0)
  const [draftPosts, setDraftPosts] = useState(0)
  
  // Load user stats on component mount
  React.useEffect(() => {
    if (user) {
      loadUserStats()
    }
  }, [user])

  const loadUserStats = async () => {
    try {
      // Get scheduled posts count
      const { data: scheduledData, error: scheduledError } = await supabase
        .from('scheduled_posts')
        .select('id, status, created_at')
        .eq('user_id', user?.id)

      if (scheduledError) throw scheduledError

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const thisMonthPosts = scheduledData?.filter(post => 
        new Date(post.created_at) >= startOfMonth
      ).length || 0
      
      const pendingPosts = scheduledData?.filter(post => 
        post.status === 'pending'
      ).length || 0
      
      const draftPostsCount = scheduledData?.filter(post => 
        post.status === 'draft'
      ).length || 0

      setPostsThisMonth(thisMonthPosts)
      setScheduledPosts(pendingPosts)
      setDraftPosts(draftPostsCount)
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const blogStats = {
    totalBlogs: postsThisMonth + 35, // Add some base number for demo
    thisMonth: postsThisMonth,
    scheduled: scheduledPosts,
    drafts: draftPosts,
    avgWordsPerPost: 1250,
    totalWords: (postsThisMonth + 35) * 1250
  }

  const stats = [
    { title: 'Total Blogs Posted', value: blogStats.totalBlogs.toString(), change: `+${blogStats.thisMonth} this month`, icon: FileText, color: 'bg-teal-600' },
    { title: 'Scheduled Posts', value: blogStats.scheduled.toString(), change: 'Next: Tomorrow 9AM', icon: Clock, color: 'bg-blue-600' },
    { title: 'Draft Posts', value: blogStats.drafts.toString(), change: 'Ready to schedule', icon: Edit, color: 'bg-purple-600' },
    { title: 'Total Words Written', value: `${(blogStats.totalWords / 1000).toFixed(1)}k`, change: `Avg: ${blogStats.avgWordsPerPost} words/post`, icon: Target, color: 'bg-orange-600' },
  ]

  const recentActivity = [
    { id: 1, action: 'Blog post published: "10 SEO Tips for 2025"', time: '2 hours ago', type: 'blog' },
    { id: 2, action: 'New blog scheduled for tomorrow', time: '5 hours ago', type: 'schedule' },
    { id: 3, action: 'WordPress site connected', time: '1 day ago', type: 'connection' },
    { id: 4, action: 'Blog post generated: "AI in Marketing"', time: '2 days ago', type: 'generation' },
  ]

  const quickActions = [
    { title: 'Create Schedule', icon: Calendar, color: 'bg-teal-500' },
    { title: 'Generate Blog', icon: Plus, color: 'bg-blue-500' },
    { title: 'View Analytics', icon: BarChart3, color: 'bg-purple-500' },
    { title: 'Schedule Meeting', icon: Calendar, color: 'bg-orange-500' },
  ]

  const hasConnectedSites = connectedSites.length > 0

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* WordPress Connection Status */}
        {!hasConnectedSites && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-medium text-amber-800">No WordPress Sites Connected</h3>
                  <p className="text-sm text-amber-700">Connect your WordPress site to start publishing automated blogs</p>
                </div>
              </div>
              <Link
                to="/settings"
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                Connect Site
              </Link>
            </div>
          </motion.div>
        )}

        {hasConnectedSites && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-teal-50 border border-teal-200 rounded-lg p-4"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="font-medium text-teal-800">
                  {connectedSites.length} WordPress Site{connectedSites.length > 1 ? 's' : ''} Connected
                </h3>
                <p className="text-sm text-teal-700">
                  {connectedSites.map(site => site.name).join(', ')} - Ready for automated posting
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back!</h2>
          <p className="text-gray-600">Here's your blog publishing overview and recent activity.</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Quick Actions</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPopup(true)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New</span>
            </motion.button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-medium text-gray-800">{action.title}</h4>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Analytics Overview</h3>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg">
                  This Week
                </button>
                <Filter className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            
            <div className="h-64 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-teal-600 mx-auto mb-4" />
                <p className="text-gray-600">Blog performance analytics will be displayed here</p>
                <p className="text-sm text-gray-500 mt-2">Track views, engagement, and SEO performance</p>
              </div>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Blog Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Popup Modal */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Create New</h3>
                <button
                  onClick={() => setShowPopup(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <motion.button
                    key={action.title}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (action.title === 'Upgrade Plan') {
                        setShowPricing(true)
                      }
                      setShowPopup(false)
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center`}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-800">{action.title}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
      />
    </DashboardLayout>
  )
}

export default Dashboard