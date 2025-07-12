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
  userPoints: number
  loadConnectedSites: (userId?: string) => Promise<void>
  loadUserPoints: (userId?: string) => Promise<void>
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
  const [userPoints, setUserPoints] = useState(1250)
  const [sitesLoaded, setSitesLoaded] = useState(false)
  const [pointsLoaded, setPointsLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user && (!sitesLoaded || !pointsLoaded)) {
        loadConnectedSites(session.user.id)
        loadUserPoints(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            setSession(null)
            setUser(null)
            setConnectedSites([])
            setSitesLoaded(false)
            setPointsLoaded(false)
          } else {
            setSession(session)
            setUser(session?.user ?? null)
          }
        } else if (event === 'SIGNED_IN' && session) {
          setSession(session)
          setUser(session.user)
          setSitesLoaded(false)
          setPointsLoaded(false)
          loadConnectedSites(session.user.id)
          loadUserPoints(session.user.id)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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

  const loadUserPoints = async (userId?: string) => {
    const targetUserId = userId || user?.id
    if (!targetUserId) {
      console.warn('No user ID available for loading user points')
      setUserPoints(1250)
      setPointsLoaded(false)
      return
    }

    try {
      // Get posts created this month to calculate points used
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const { data: postsData, error } = await supabase
        .from('scheduled_posts')
        .select('id, created_at')
        .eq('user_id', targetUserId)
        .gte('created_at', startOfMonth.toISOString())

      if (error) throw error

      // Calculate points used (15 points per post)
      const postsThisMonth = postsData?.length || 0
      const pointsUsed = postsThisMonth * 15
      const remainingPoints = Math.max(1250 - pointsUsed, 0)
      
      setUserPoints(remainingPoints)
      setPointsLoaded(true)
    } catch (error) {
      console.error('Error loading user points:', error)
      setUserPoints(1250)
      setPointsLoaded(false)
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
    
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setConnectedSites([])
    setUserPoints(1250)
    setSitesLoaded(false)
    setPointsLoaded(false)
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
    userPoints,
    loadConnectedSites,
    loadUserPoints,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}