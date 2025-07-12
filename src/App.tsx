import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SignUp from './components/auth/SignUp'
import SignIn from './components/auth/SignIn'
import ForgotPassword from './components/auth/ForgotPassword'
import Dashboard from './components/dashboard/Dashboard'
import Settings from './components/settings/Settings'
import PostSchedule from './components/schedule/PostSchedule'
import Analytics from './components/analytics/Analytics'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/schedule" 
            element={
              <ProtectedRoute>
                <PostSchedule />
              </ProtectedRoute>
            } 
          />
          {/* Placeholder routes for sidebar navigation */}
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } 
          />
          <Route path="/content" element={<ProtectedRoute><div className="p-6"><h1>Content Library - Coming Soon</h1></div></ProtectedRoute>} />
          <Route path="/audience" element={<ProtectedRoute><div className="p-6"><h1>Audience - Coming Soon</h1></div></ProtectedRoute>} />
          <Route path="/campaigns" element={<ProtectedRoute><div className="p-6"><h1>Campaigns - Coming Soon</h1></div></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><div className="p-6"><h1>Messages - Coming Soon</h1></div></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App