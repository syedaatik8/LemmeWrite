import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, Clock, Target, FileText, Zap, 
  Settings, Save, Plus, Globe, Tag, Hash, CheckCircle, X
} from 'lucide-react'
import DashboardLayout from '../layout/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import { scheduleService, PostSchedule as PostScheduleType, ImmediatePostRequest } from '../../lib/schedules'
import { supabase } from '../../lib/supabase'

const PostSchedule: React.FC = () => {
  const { connectedSites, userPoints, loadUserPoints } = useAuth()
  const [scheduleType, setScheduleType] = useState('topic')
  const [frequency, setFrequency] = useState('daily')
  const [wordCount, setWordCount] = useState('1000')
  const [selectedSite, setSelectedSite] = useState('')
  const [topic, setTopic] = useState('')
  const [categories, setCategories] = useState('')
  const [keywords, setKeywords] = useState('')
  const [description, setDescription] = useState('')
  const [imageKeywords, setImageKeywords] = useState('')
  const [stopCondition, setStopCondition] = useState('points_exhausted')
  const [stopDate, setStopDate] = useState('')
  const [maxPosts, setMaxPosts] = useState('')
  const [publishTime, setPublishTime] = useState('09:00')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPostingNow, setIsPostingNow] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const clearSuccess = () => setSuccess('')
  const clearError = () => setError('')

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

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSite) {
      setError('Please select a WordPress site')
      return
    }

    let contentInput = ''
    switch (scheduleType) {
      case 'topic':
        contentInput = topic
        break
      case 'category':
        contentInput = categories
        break
      case 'keyword':
        contentInput = keywords
        break
    }

    if (!contentInput.trim()) {
      setError(`Please enter ${scheduleType === 'topic' ? 'a topic' : scheduleType === 'category' ? 'categories' : 'keywords'}`)
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const scheduleData: PostScheduleType = {
        wordpress_site_id: selectedSite,
        schedule_type: scheduleType as 'topic' | 'category' | 'keyword',
        content_input: contentInput,
        description: description || undefined,
        image_keywords: imageKeywords || undefined,
        frequency: frequency as 'daily' | 'weekly' | 'biweekly' | 'monthly',
        word_count: parseInt(wordCount),
        publish_time: publishTime,
        stop_condition: stopCondition as 'never' | 'date' | 'post_count' | 'points_exhausted',
        stop_date: stopCondition === 'date' ? stopDate : undefined,
        max_posts: stopCondition === 'post_count' ? parseInt(maxPosts) : undefined
      }

      const { data, error: createError } = await scheduleService.createSchedule(scheduleData)

      if (createError) {
        throw createError
      }

      setSuccess('Post schedule created successfully! Your first blog post will be generated and scheduled shortly.')
      
      // Reset form
      setTopic('')
      setCategories('')
      setKeywords('')
      setDescription('')
      setImageKeywords('')
      setSelectedSite('')
      
      // Reload user points to reflect the new post
      loadUserPoints()
      
    } catch (err: any) {
      console.error('Error creating schedule:', err)
      setError(err.message || 'Failed to create schedule. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePostNow = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSite) {
      setError('Please select a WordPress site')
      return
    }

    let contentInput = ''
    switch (scheduleType) {
      case 'topic':
        contentInput = topic
        break
      case 'category':
        contentInput = categories
        break
      case 'keyword':
        contentInput = keywords
        break
    }

    if (!contentInput.trim()) {
      setError(`Please enter ${scheduleType === 'topic' ? 'a topic' : scheduleType === 'category' ? 'categories' : 'keywords'}`)
      return
    }

    setIsPostingNow(true)
    setError('')
    setSuccess('')

    try {
      const postData: ImmediatePostRequest = {
        wordpress_site_id: selectedSite,
        schedule_type: scheduleType as 'topic' | 'category' | 'keyword',
        content_input: contentInput,
        description: description || undefined,
        image_keywords: imageKeywords || undefined,
        word_count: parseInt(wordCount)
      }

      const { data, error: createError } = await scheduleService.createImmediatePost(postData)

      if (createError) {
        throw createError
      }

      if (data?.status === 'published') {
        setSuccess(`Blog post "${data.title}" has been successfully published to your WordPress site!`)
      } else if (data?.status === 'failed') {
        setError(`Failed to publish blog post: ${data.error_message || 'Unknown error occurred'}`)
      } else {
        setSuccess('Blog post created and queued for publishing! It will be published to your WordPress site shortly.')
      }
      
      // Reset form
      setTopic('')
      setCategories('')
      setKeywords('')
      setDescription('')
      setImageKeywords('')
      setSelectedSite('')
      
      // Reload user points to reflect the new post
      loadUserPoints()
      
    } catch (err: any) {
      console.error('Error creating immediate post:', err)
      setError(err.message || 'Failed to create post. Please try again.')
    } finally {
      setIsPostingNow(false)
    }
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

          {/* Success/Error Messages */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>{success}</span>
              </div>
              <button
                onClick={clearSuccess}
                className="text-green-500 hover:text-green-700 ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between"
            >
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="space-y-8">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image Keywords (Optional)
                      </label>
                      <input
                        type="text"
                        value={imageKeywords}
                        onChange={(e) => setImageKeywords(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                        placeholder="e.g., facebook, AI, social media, technology, business"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Specify keywords for finding relevant featured images. Leave empty to auto-select based on title.
                      </p>
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

                {/* Schedule Stopping Options */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white rounded-xl shadow-sm p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">When to Stop Posting</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stop Condition
                      </label>
                      <select
                        value={stopCondition}
                        onChange={(e) => setStopCondition(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      >
                        <option value="points_exhausted">When points run out (Recommended)</option>
                        <option value="date">Stop on a specific date</option>
                        <option value="post_count">After a certain number of posts</option>
                        <option value="never">Keep posting indefinitely</option>
                      </select>
                      <p><strong>Smart Choice:</strong> The schedule will automatically stop when you run out of points. This prevents unexpected charges and gives you control over your spending.</p>
                    </div>

                    {stopCondition === 'date' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Stop Date
                        </label>
                        <input
                          type="date"
                          value={stopDate}
                          onChange={(e) => setStopDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                          required
                        />
                      </div>
                    )}

                    {stopCondition === 'post_count' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Posts
                        </label>
                        <input
                          type="number"
                          value={maxPosts}
                          onChange={(e) => setMaxPosts(e.target.value)}
                          min="1"
                          max="100"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                          placeholder="e.g., 10"
                          required
                        />
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs">i</span>
                        </div>
                        <div className="text-sm text-blue-700">
                          {stopCondition === 'points_exhausted' && (
                            <p><strong>Smart Choice:</strong> The schedule will automatically stop when you run out of points. This prevents unexpected charges and gives you control over your spending.</p>
                          )}
                          {stopCondition === 'date' && (
                            <p><strong>Date-based:</strong> Posts will stop being generated after the selected date, even if you have points remaining.</p>
                          )}
                          {stopCondition === 'post_count' && (
                            <p><strong>Post limit:</strong> The schedule will stop after generating the specified number of posts, regardless of points or date.</p>
                          )}
                          {stopCondition === 'never' && (
                            <p><strong>Continuous:</strong> Posts will keep generating as long as you have points. Make sure to monitor your usage!</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-end space-x-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handlePostNow}
                    disabled={isPostingNow || connectedSites.length === 0}
                    className="bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPostingNow ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Publishing Now...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        <span>Post Now</span>
                      </>
                    )}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleCreateSchedule}
                    disabled={isSubmitting || connectedSites.length === 0}
                    className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating Schedule...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Create Schedule</span>
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </div>
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
                <div className="text-3xl font-bold text-teal-600 mb-2">{userPoints.toLocaleString()}</div>
                <div className="text-sm text-gray-600 mb-4">
                  Enough for {Math.floor(userPoints / calculateCost())} posts
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
                    <span>Featured images from Unsplash</span>
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