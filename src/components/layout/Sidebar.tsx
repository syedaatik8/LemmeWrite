import React from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, Calendar, Settings, Users, BarChart3, 
  FileText, Zap, MessageSquare, Target, Globe,
  PenTool, Clock
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const Sidebar: React.FC = () => {
  const location = useLocation()
  const { user } = useAuth()
  const [userPoints, setUserPoints] = React.useState(1250)

  // Load user points
  React.useEffect(() => {
    if (user) {
      loadUserPoints()
    }
  }, [user])

  const loadUserPoints = async () => {
    try {
      // Get posts created this month to calculate points used
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const { data: postsData, error } = await supabase
        .from('scheduled_posts')
        .select('id, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', startOfMonth.toISOString())

      if (error) throw error

      // Calculate points used (15 points per post)
      const postsThisMonth = postsData?.length || 0
      const pointsUsed = postsThisMonth * 15
      const remainingPoints = Math.max(1250 - pointsUsed, 0)
      
      setUserPoints(remainingPoints)
    } catch (error) {
      console.error('Error loading user points:', error)
    }
  }

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard' },
    { name: 'Analytics', icon: BarChart3, path: '/analytics' },
    { name: 'Content Library', icon: FileText, path: '/content' },
    { name: 'Audience', icon: Users, path: '/audience' },
    { name: 'Campaigns', icon: Target, path: '/campaigns' },
    { name: 'Messages', icon: MessageSquare, path: '/messages' },
  ]

  const mainFeatures = [
    { name: 'Create Post Schedule', icon: Calendar, path: '/schedule' },
  ]

  const bottomItems = [
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="w-64 bg-white h-screen shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-teal-600 w-10 h-10 rounded-lg flex items-center justify-center">
            <PenTool className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">LemmeWrite</h1>
            <p className="text-xs text-gray-500">We write, you rest</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Main Menu */}
        <div className="px-4 mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Main Menu
          </h3>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Main Features */}
        <div className="px-4 mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Features
          </h3>
          <nav className="space-y-1">
            {mainFeatures.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
                <span className="ml-auto bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full">
                  New
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Points Display */}
        <div className="px-4 mb-6">
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Available Points</span>
              <Zap className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-bold text-teal-600 mb-1">{userPoints.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Resets monthly</div>
            <button className="w-full mt-3 bg-teal-600 text-white text-sm py-2 rounded-lg hover:bg-teal-700 transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Items */}
      <div className="border-t border-gray-200 p-4">
        <nav className="space-y-1">
          {bottomItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default Sidebar