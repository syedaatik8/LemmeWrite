import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Key, Image, CheckCircle, AlertCircle, TestTube, 
  Eye, EyeOff, Save, ExternalLink
} from 'lucide-react'
import { unsplashService } from '../../lib/unsplash'
import { openAIService } from '../../lib/openai'

const APIIntegrations: React.FC = () => {
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
  const [testResults, setTestResults] = useState<{ [key: string]: boolean | null }>({})
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({})

  const integrations = [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'AI-powered content generation',
      envKey: 'VITE_OPENAI_API_KEY',
      value: import.meta.env.VITE_OPENAI_API_KEY,
      service: openAIService,
      testMethod: 'testConnection',
      docsUrl: 'https://platform.openai.com/docs',
      setupInstructions: [
        'Go to OpenAI Platform (platform.openai.com)',
        'Create an account or sign in',
        'Navigate to API Keys section',
        'Create a new API key',
        'Copy the key and add it to your environment variables'
      ]
    },
    {
      id: 'unsplash',
      name: 'Unsplash',
      description: 'High-quality stock photos for featured images',
      envKey: 'VITE_UNSPLASH_ACCESS_KEY',
      value: import.meta.env.VITE_UNSPLASH_ACCESS_KEY,
      service: unsplashService,
      testMethod: 'testConnection',
      docsUrl: 'https://unsplash.com/developers',
      setupInstructions: [
        'Go to Unsplash Developers (unsplash.com/developers)',
        'Create an account or sign in',
        'Create a new application',
        'Copy the Access Key',
        'Add it to your environment variables as VITE_UNSPLASH_ACCESS_KEY'
      ]
    }
  ]

  useEffect(() => {
    // Initialize test results
    const initialResults: { [key: string]: boolean | null } = {}
    integrations.forEach(integration => {
      initialResults[integration.id] = integration.value ? null : false
    })
    setTestResults(initialResults)
  }, [])

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const testConnection = async (integration: any) => {
    if (!integration.value) {
      setTestResults(prev => ({ ...prev, [integration.id]: false }))
      return
    }

    setTesting(prev => ({ ...prev, [integration.id]: true }))
    
    try {
      const result = await integration.service[integration.testMethod]()
      setTestResults(prev => ({ ...prev, [integration.id]: result }))
    } catch (error) {
      console.error(`Error testing ${integration.name}:`, error)
      setTestResults(prev => ({ ...prev, [integration.id]: false }))
    } finally {
      setTesting(prev => ({ ...prev, [integration.id]: false }))
    }
  }

  const getStatusIcon = (integrationId: string) => {
    const result = testResults[integrationId]
    const isConfigured = integrations.find(i => i.id === integrationId)?.value

    if (!isConfigured) {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    }
    
    if (result === true) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (result === false) {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    } else {
      return <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
    }
  }

  const getStatusText = (integrationId: string) => {
    const result = testResults[integrationId]
    const isConfigured = integrations.find(i => i.id === integrationId)?.value

    if (!isConfigured) {
      return 'Not configured'
    }
    
    if (result === true) {
      return 'Connected'
    } else if (result === false) {
      return 'Connection failed'
    } else {
      return 'Unknown'
    }
  }

  const getStatusColor = (integrationId: string) => {
    const result = testResults[integrationId]
    const isConfigured = integrations.find(i => i.id === integrationId)?.value

    if (!isConfigured || result === false) {
      return 'text-red-600'
    } else if (result === true) {
      return 'text-green-600'
    } else {
      return 'text-gray-600'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">API Integrations</h3>
        <p className="text-sm text-gray-600">
          Manage your external API connections for enhanced functionality
        </p>
      </div>

      <div className="space-y-6">
        {integrations.map((integration) => (
          <motion.div
            key={integration.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  {integration.id === 'openai' ? (
                    <Key className="w-5 h-5 text-gray-600" />
                  ) : (
                    <Image className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">{integration.name}</h4>
                  <p className="text-sm text-gray-500">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(integration.id)}
                  <span className={`text-sm font-medium ${getStatusColor(integration.id)}`}>
                    {getStatusText(integration.id)}
                  </span>
                </div>
                <a
                  href={integration.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* API Key Display */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key ({integration.envKey})
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    type={showKeys[integration.id] ? 'text' : 'password'}
                    value={integration.value || 'Not configured'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm"
                  />
                  {integration.value && (
                    <button
                      onClick={() => toggleKeyVisibility(integration.id)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKeys[integration.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => testConnection(integration)}
                  disabled={testing[integration.id] || !integration.value}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing[integration.id] ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4" />
                      <span>Test</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Setup Instructions */}
            {!integration.value && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">Setup Instructions:</h5>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  {integration.setupInstructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
                <div className="mt-3 p-3 bg-blue-100 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Environment Variable:</strong> Add{' '}
                    <code className="bg-blue-200 px-1 rounded">{integration.envKey}=your_api_key</code>{' '}
                    to your .env file and restart the development server.
                  </p>
                </div>
              </div>
            )}

            {/* Feature Benefits */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {integration.id === 'openai' && (
                <>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>AI-powered blog content generation</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>SEO-optimized titles and descriptions</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Multiple content types and tones</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Automated keyword integration</span>
                  </div>
                </>
              )}
              {integration.id === 'unsplash' && (
                <>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>High-quality featured images</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Automatic image selection</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Proper attribution handling</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>WordPress featured image upload</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Usage Guidelines */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 mb-2">Usage Guidelines:</h4>
        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
          <li>Keep your API keys secure and never share them publicly</li>
          <li>Monitor your API usage to avoid exceeding rate limits</li>
          <li>Unsplash images are automatically attributed according to their guidelines</li>
          <li>OpenAI usage is charged based on tokens consumed</li>
          <li>Test connections regularly to ensure services are working properly</li>
        </ul>
      </div>
    </motion.div>
  )
}

export default APIIntegrations