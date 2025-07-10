import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface WordPressSite {
  id: string
  name: string
  url: string
  status: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  connectedSites: WordPressSite[]
  loadConnectedSites: (userId?: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<any>
  updateProfile: (firstName: string, lastName: string, phone?: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectedSites, setConnectedSites] = useState<WordPressSite[]>([])
  const [sitesLoaded, setSitesLoaded] = useState(false)

  useEffect(() => {
    // Configure session persistence for 24 hours
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check if session is still valid (within 24 hours)
        const sessionAge = Date.now() - new Date(session.user.created_at).getTime()
        const twentyFourHours = 24 * 60 * 60 * 1000
        
        if (sessionAge > twentyFourHours) {
          // Session is older than 24 hours, sign out
          supabase.auth.signOut()
          setSession(null)
          setUser(null)
          setConnectedSites([])
          setSitesLoaded(false)
        } else {
          setSession(session)
          setUser(session.user)
          // Load connected sites only once when session is established
          if (!sitesLoaded) {
            loadConnectedSites(session.user.id)
          }
        }
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setConnectedSites([])
          setSitesLoaded(false)
        } else if (event === 'SIGNED_IN' && session) {
          setSession(session)
          setUser(session.user)
          // Load connected sites only once when user signs in
          if (!sitesLoaded) {
            loadConnectedSites(session.user.id)
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session)
          setUser(session.user)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [sitesLoaded])

  const loadConnectedSites = async (userId?: string) => {
    const targetUserId = userId || user?.id
    if (!targetUserId) {
      console.warn('No user ID available for loading connected sites')
      setConnectedSites([])
      setSitesLoaded(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('wordpress_sites')
        .select('id, name, url, status')
        .eq('user_id', targetUserId)
        .eq('status', 'connected')

      if (error) throw error
      setConnectedSites(data || [])
      setSitesLoaded(true)
    } catch (error) {
      console.error('Error loading connected sites:', error)
      setConnectedSites([])
      setSitesLoaded(false)
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (data.session) {
      // Reset sites loaded flag to trigger fresh load
      setSitesLoaded(false)
    }
    
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setConnectedSites([])
    setSitesLoaded(false)
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }

  const updateProfile = async (firstName: string, lastName: string, phone?: string) => {
    if (!user) return { error: { message: 'No user logged in' } }
    
    const { data, error } = await supabase.rpc('update_user_profile', {
      user_id: user.id,
      new_first_name: firstName,
      new_last_name: lastName,
      new_phone: phone || null
    })
    
    return { data, error }
  }

  const value = {
    user,
    session,
    loading,
    connectedSites,
    loadConnectedSites,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}