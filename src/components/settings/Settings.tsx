import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Globe, Camera, Save, Key } from 'lucide-react'
import DashboardLayout from '../layout/DashboardLayout'
import ProfileSettings from './ProfileSettings'
import WordPressIntegration from './WordPressIntegration'
import APIIntegrations from './APIIntegrations'

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'wordpress', name: 'WordPress Integration', icon: Globe },
    { id: 'integrations', name: 'API Integrations', icon: Key },
  ]

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your account and integrations</p>
          </motion.div>

          <div className="bg-white rounded-xl shadow-sm">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'profile' && <ProfileSettings />}
              {activeTab === 'wordpress' && <WordPressIntegration />}
              {activeTab === 'integrations' && <APIIntegrations />}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Settings