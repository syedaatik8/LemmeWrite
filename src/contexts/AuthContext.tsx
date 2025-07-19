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
  userPlan: string
  loadConnectedSites: (userId?: string) => Promise<void>
  loadUserPoints: (userId?: string) => Promise<void>
  loadUserPlan: (userId?: string) => Promise<void>
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
  const [userPoints, setUserPoints] = useState(50) // Default to free plan points
  const [userPlan, setUserPlan] = useState('Free Plan')
  const [sitesLoaded, setSitesLoaded] = useState(false)
  const [pointsLoaded, setPointsLoaded] = useState(false)
  const [planLoaded, setPlanLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user && (!sitesLoaded || !pointsLoaded || !planLoaded)) {
        loadConnectedSites(session.user.id)
        loadUserPoints(session.user.id)
        loadUserPlan(session.user.id)
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
            setUserPoints(50)
            setUserPlan('Free Plan')
            setSitesLoaded(false)
            setPointsLoaded(false)
            setPlanLoaded(false)
          } else {
            setSession(session)
            setUser(session?.user ?? null)
          }
        } else if (event === 'SIGNED_IN' && session) {
          setSession(session)
          setUser(session.user)
          setSitesLoaded(false)
          setPointsLoaded(false)
          setPlanLoaded(false)
          loadConnectedSites(session.user.id)
          loadUserPoints(session.user.id)
          loadUserPlan(session.user.id)
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
      setUserPoints(50)
      setPointsLoaded(false)
      return
    }

    try {
      // First try to get points from user_points table
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('points_remaining, points_total')
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (pointsError && pointsError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw pointsError
      }

      if (pointsData) {
        // User has points record, use it
        setUserPoints(pointsData.points_remaining)
        setPointsLoaded(true)
        return
      }

      // Fallback: Calculate points based on posts created this month (for users without points table entry)
      console.log('No points record found, calculating from posts...')
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
      const remainingPoints = Math.max(50 - pointsUsed, 0) // Default to free plan
      
      setUserPoints(remainingPoints)
      setPointsLoaded(true)
    } catch (error) {
      console.error('Error loading user points:', error)
      setUserPoints(50)
      setPointsLoaded(false)
    }
  }

  const loadUserPlan = async (userId?: string) => {
    const targetUserId = userId || user?.id
    if (!targetUserId) {
      console.warn('No user ID available for loading user plan')
      setUserPlan('Free Plan')
      setPlanLoaded(false)
      return
    }

    try {
      const { data: subscriptionData, error } = await supabase
        .from('user_subscriptions')
        .select('plan_type, status')
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (subscriptionData) {
        // Map plan types to display names
        const planNames = {
          'free': 'Free Plan',
          'pro': 'Creator Plan',
          'business': 'Agency Plan',
          'enterprise': 'Scale Plan'
        }
        setUserPlan(planNames[subscriptionData.plan_type] || 'Free Plan')
      } else {
        setUserPlan('Free Plan')
      }
      
      setPlanLoaded(true)
    } catch (error) {
      console.error('Error loading user plan:', error)
      setUserPlan('Free Plan')
      setPlanLoaded(false)
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
    setUserPoints(50)
    setUserPlan('Free Plan')
    setSitesLoaded(false)
    setPointsLoaded(false)
    setPlanLoaded(false)
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
    userPlan,
    loadConnectedSites,
    loadUserPoints,
    loadUserPlan,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}