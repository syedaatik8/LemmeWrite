import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Globe, Plus, Trash2, Edit, CheckCircle, AlertCircle, 
  Eye, EyeOff, Save, TestTube, Link as LinkIcon, X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface WordPressSite {
  id: string
  name: string
  url: string
  username: string
  password: string
  status: 'connected' | 'disconnected' | 'testing'
  created_at?: string
  updated_at?: string
}

const WordPressIntegration: React.FC = () => {
  const { user, loadConnectedSites } = useAuth()
  const [sites, setSites] = useState<WordPressSite[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSite, setEditingSite] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load WordPress sites on component mount
  useEffect(() => {
    if (user) {
      loadWordPressSites()
    }
  }, [user])

  const loadWordPressSites = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('wordpress_sites')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSites(data || [])
    } catch (err) {
      console.error('Error loading WordPress sites:', err)
      setError('Failed to load WordPress sites')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSite = async () => {
    if (!formData.name || !formData.url || !formData.username || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    try {
      setError('')
      const { data, error } = await supabase
        .from('wordpress_sites')
        .insert([
          {
            user_id: user?.id,
            name: formData.name,
            url: formData.url.replace(/\/$/, ''), // Remove trailing slash
            username: formData.username,
            password: formData.password,
            status: 'disconnected'
          }
        ])
        .select()

      if (error) throw error

      setSites([...sites, ...data])
      setFormData({ name: '', url: '', username: '', password: '' })
      setShowAddForm(false)
      setSuccess('WordPress site added successfully!')
      // Reload connected sites in auth context
      if (data[0]?.status === 'connected') {
        loadConnectedSites(user?.id)
      }
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error adding WordPress site:', err)
      setError('Failed to add WordPress site')
    }
  }

  const handleUpdateSite = async (id: string, updates: Partial<WordPressSite>) => {
    try {
      setError('')
      const { data, error } = await supabase
        .from('wordpress_sites')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()

      if (error) throw error

      setSites(sites.map(site => 
        site.id === id ? { ...site, ...data[0] } : site
      ))
      setEditingSite(null)
      setSuccess('WordPress site updated successfully!')
      // Reload connected sites in auth context when status changes
      if (updates.status) {
        loadConnectedSites(user?.id)
      }
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error updating WordPress site:', err)
      setError('Failed to update WordPress site')
    }
  }

  const handleDeleteSite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this WordPress site?')) {
      return
    }

    try {
      setError('')
      const { error } = await supabase
        .from('wordpress_sites')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error

      setSites(sites.filter(site => site.id !== id))
      setSuccess('WordPress site deleted successfully!')
      // Reload connected sites in auth context
      loadConnectedSites(user?.id)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error deleting WordPress site:', err)
      setError('Failed to delete WordPress site')
    }
  }

  const handleTestConnection = async (id: string) => {
    try {
      // Update status to testing
      await handleUpdateSite(id, { status: 'testing' })
      
      const site = sites.find(s => s.id === id)
      if (!site) return

      // Test WordPress REST API connection
      const auth = btoa(`${site.username}:${site.password}`)
      const apiUrl = `${site.url}/wp-json/wp/v2/users/me`

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      })

      const newStatus = response.ok ? 'connected' : 'disconnected'
      await handleUpdateSite(id, { status: newStatus })

      // Reload connected sites in auth context
      loadConnectedSites(user?.id)

      if (response.ok) {
        setSuccess('Connection test successful!')
      } else {
        setError('Connection test failed. Please check your credentials.')
      }
      setTimeout(() => {
        setSuccess('')
        setError('')
      }, 3000)
    } catch (err) {
      console.error('Error testing connection:', err)
      await handleUpdateSite(id, { status: 'disconnected' })
      setError('Connection test failed')
      setTimeout(() => setError(''), 3000)
    }
  }

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const resetForm = () => {
    setFormData({ name: '', url: '', username: '', password: '' })
    setShowAddForm(false)
    setEditingSite(null)
    setError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg"
        >
          {success}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          {error}
        </motion.div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">WordPress Sites</h3>
          <p className="text-sm text-gray-600">Connect your WordPress sites to enable automated posting</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddForm(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Site</span>
        </motion.button>
      </div>

      {/* Add Site Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-50 rounded-lg p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-800">Add WordPress Site</h4>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                placeholder="My Blog"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                placeholder="https://yourblog.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                placeholder="xxxx xxxx xxxx xxxx"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddSite}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Add Site</span>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Sites List */}
      <div className="space-y-4">
        {sites.map((site) => (
          <motion.div
            key={site.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  site.status === 'connected' ? 'bg-green-500' :
                  site.status === 'testing' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <h4 className="font-medium text-gray-800">{site.name}</h4>
                  <p className="text-sm text-gray-500 flex items-center space-x-1">
                    <LinkIcon className="w-3 h-3" />
                    <span>{site.url}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {site.status === 'connected' && (
                  <span className="flex items-center space-x-1 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Connected</span>
                  </span>
                )}
                {site.status === 'disconnected' && (
                  <span className="flex items-center space-x-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Disconnected</span>
                  </span>
                )}
                {site.status === 'testing' && (
                  <span className="flex items-center space-x-1 text-yellow-600 text-sm">
                    <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Testing...</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Username
                </label>
                <p className="text-sm text-gray-800">{site.username}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Application Password
                </label>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-800 font-mono">
                    {showPasswords[site.id] ? site.password : '••••••••••••••••'}
                  </p>
                  <button
                    onClick={() => togglePasswordVisibility(site.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords[site.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTestConnection(site.id)}
                  disabled={site.status === 'testing'}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1 disabled:opacity-50"
                >
                  <TestTube className="w-3 h-3" />
                  <span>Test Connection</span>
                </motion.button>
              </div>
              <button
                onClick={() => handleDeleteSite(site.id)}
                className="text-red-600 hover:text-red-800 px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {sites.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No WordPress Sites Connected</h3>
          <p className="text-gray-600 mb-4">Add your first WordPress site to start automated posting</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(true)}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add WordPress Site</span>
          </motion.button>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">How to get Application Password:</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Log in to your WordPress admin dashboard</li>
          <li>Go to Users → Profile (or Users → All Users → Edit your user)</li>
          <li>Scroll down to "Application Passwords" section</li>
          <li>Enter a name (e.g., "LemmeWrite") and click "Add New Application Password"</li>
          <li>Copy the generated password and paste it here</li>
          <li>Note: The password will only be shown once, so copy it immediately</li>
        </ol>
        <div className="mt-3 p-3 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            <strong>Important:</strong> Make sure your WordPress site has the REST API enabled and accessible. 
            Most modern WordPress installations have this enabled by default.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default WordPressIntegration