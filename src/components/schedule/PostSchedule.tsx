import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, Clock, Target, FileText, Zap, 
  Settings, Save, Plus, Globe, Tag, Hash
} from 'lucide-react'
import DashboardLayout from '../layout/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'

const PostSchedule: React.FC = () => {
  const { connectedSites } = useAuth()
  const [scheduleType, setScheduleType] = useState('topic')
  const [frequency, setFrequency] = useState('daily')
  const [wordCount, setWordCount] = useState('1000')
  const [selectedSite, setSelectedSite] = useState('')
  const [topic, setTopic] = useState('')
  const [categories, setCategories] = useState('')
  const [keywords, setKeywords] = useState('')
  const [description, setDescription] = useState('')
  const [publishTime, setPublishTime] = useState('09:00')

  const scheduleTypes = [
    { id: 'topic', name: 'Topic-Based', icon: Target, description: 'Generate posts based on specific topics' },
    { id: 'category', name: 'Category-Based', icon: Tag, description: 'Generate posts for specific categories' },
    { id: 'keyword', name: 'Keyword-Based', icon: Hash, description: 'Generate posts targeting specific keywords' },
  ]

  const frequencies = [
    { id: 'daily', name: 'Daily', cost: 10 },
    { id: 'weekly', name: 'Weekly', cost: 5 },
    { id: 'biweekly', name: 'Bi-weekly', cost: 3 },
    { id: 'monthly', name: 'Monthly', cost: 2 },
  ]

  const wordCounts = [
    { id: '500', name: '500 words', cost: 5 },
    { id: '1000', name: '1000 words', cost: 10 },
    { id: '1500', name: '1500 words', cost: 15 },
    { id: '2000', name: '2000 words', cost: 20 },
  ]

  const calculateCost = () => {
    const freqCost = frequencies.find(f => f.id === frequency)?.cost || 0
    const wordCost = wordCounts.find(w => w.id === wordCount)?.cost || 0
    return freqCost + wordCost
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle schedule creation
    console.log('Creating schedule...', {
      scheduleType,
      frequency,
      wordCount,
      selectedSite,
      topic,
      categories,
      keywords,
      description,
      publishTime
    })
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Post Schedule</h1>
            <p className="text-gray-600">Set up automated blog posting for your WordPress sites</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Schedule Type */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl shadow-sm p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Content Type</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {scheduleTypes.map((type) => (
                      <div
                        key={type.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          scheduleType === type.id
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setScheduleType(type.id)}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <type.icon className={`w-5 h-5 ${
                            scheduleType === type.id ? 'text-teal-600' : 'text-gray-400'
                          }`} />
                          <span className="font-medium text-gray-800">{type.name}</span>
                        </div>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Content Input */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl shadow-sm p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Content Details</h3>
                  <div className="space-y-4">
                    {scheduleType === 'topic' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Topic
                        </label>
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                          placeholder="e.g., Digital Marketing, Web Development, AI Technology"
                        />
                      </div>
                    )}

                    {scheduleType === 'category' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Categories
                        </label>
                        <input
                          type="text"
                          value={categories}
                          onChange={(e) => setCategories(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                          placeholder="e.g., Technology, Business, Lifestyle (comma separated)"
                        />
                      </div>
                    )}

                    {scheduleType === 'keyword' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Keywords
                        </label>
                        <input
                          type="text"
                          value={keywords}
                          onChange={(e) => setKeywords(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                          placeholder="e.g., SEO, content marketing, social media (comma separated)"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Description (Optional)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                        placeholder="Provide additional context or specific requirements for the content..."
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Schedule Settings */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-xl shadow-sm p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Schedule Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Publishing Frequency
                      </label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      >
                        {frequencies.map((freq) => (
                          <option key={freq.id} value={freq.id}>
                            {freq.name} ({freq.cost} points per post)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Word Count
                      </label>
                      <select
                        value={wordCount}
                        onChange={(e) => setWordCount(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      >
                        {wordCounts.map((count) => (
                          <option key={count.id} value={count.id}>
                            {count.name} (+{count.cost} points)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WordPress Site
                      </label>
                      <select
                        value={selectedSite}
                        onChange={(e) => setSelectedSite(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                        required
                      >
                        <option value="">Select a site</option>
                        {connectedSites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name} ({site.url})
                          </option>
                        ))}
                      </select>
                      {connectedSites.length === 0 && (
                        <p className="text-sm text-amber-600 mt-1">
                          No WordPress sites connected. Please add a site in Settings first.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Publish Time
                      </label>
                      <input
                        type="time"
                        value={publishTime}
                        onChange={(e) => setPublishTime(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-end"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>Create Schedule</span>
                  </motion.button>
                </motion.div>
              </form>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Cost Calculator */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base frequency cost:</span>
                    <span className="font-medium">{frequencies.find(f => f.id === frequency)?.cost || 0} points</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Word count bonus:</span>
                    <span className="font-medium">+{wordCounts.find(w => w.id === wordCount)?.cost || 0} points</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total per post:</span>
                      <span className="text-teal-600">{calculateCost()} points</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Points Balance */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Available Points</h3>
                  <Zap className="w-5 h-5 text-teal-600" />
                </div>
                <div className="text-3xl font-bold text-teal-600 mb-2">1,250</div>
                <div className="text-sm text-gray-600 mb-4">
                  Enough for {Math.floor(1250 / calculateCost())} posts
                </div>
                <button className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm">
                  Upgrade Plan
                </button>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Features Included</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>AI-powered content generation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>SEO optimization</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Automatic publishing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Content scheduling</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Performance tracking</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default PostSchedule