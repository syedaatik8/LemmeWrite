import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Zap, X, RefreshCw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { user, loadUserPoints } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null)

  const subscriptionId = searchParams.get('subscription_id')
  const token = searchParams.get('token')

  useEffect(() => {
    if (subscriptionId) {
      handlePaymentSuccess()
    } else {
      setError('No subscription ID found in URL')
      setLoading(false)
    }
  }, [subscriptionId])

  const handlePaymentSuccess = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        setError('Please sign in to complete your subscription activation')
        setLoading(false)
        return
      }
      
      console.log('Processing payment success for subscription:', subscriptionId)
      
      // Determine plan type based on subscription (you might need to adjust this logic)
      let planType = 'pro' // Default
      let pointsToAllocate = 1250
      
      // You can enhance this by calling PayPal API to get subscription details
      // For now, we'll default to pro plan
      
      // 1. Create/Update subscription record
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: currentUser?.id,
          paypal_subscription_id: subscriptionId,
          plan_type: planType,
          status: 'active',
          activated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'paypal_subscription_id'
        })
        .select()
        .single()

      if (subscriptionError) {
        console.error('Subscription error:', subscriptionError)
        throw new Error('Failed to update subscription: ' + subscriptionError.message)
      }

      console.log('Subscription updated:', subscriptionData)

      // 2. Allocate points to user
      // Points will be allocated by the PayPal webhook automatically
      // We don't need to do this from the client side due to RLS policies
      console.log('Points will be allocated by webhook for plan:', planType)

      // 3. Log the payment
      const { error: paymentLogError } = await supabase
        .from('payment_history')
        .insert({
          user_id: currentUser?.id,
          paypal_subscription_id: subscriptionId,
          event_type: 'subscription_activated',
          amount: planType === 'pro' ? 29 : planType === 'business' ? 79 : 199,
          currency: 'USD',
          created_at: new Date().toISOString()
        })

      if (paymentLogError) {
        console.warn('Failed to log payment:', paymentLogError)
        // Don't fail the whole process for logging issues
      }

      // 4. Refresh user points in context
      await loadUserPoints(currentUser?.id)

      setSubscriptionDetails({
        planType,
        points: pointsToAllocate,
        subscriptionId
      })

    } catch (err: any) {
      console.error('Error processing payment success:', err)
      setError(err.message || 'Failed to process payment confirmation')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Processing your subscription...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we activate your account</p>
        </div>
      </div>
    )
  }
  
  // If no user is logged in, show sign in prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to complete your subscription activation.</p>
          <Link to="/signin" className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors">Sign In</Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Activation Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/dashboard"
              className="block w-full bg-gray-100 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            If this issue persists, please contact support with subscription ID: {subscriptionId}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-green-600" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to {subscriptionDetails?.planType === 'pro' ? 'Creator' : subscriptionDetails?.planType === 'business' ? 'Agency' : 'Scale'} Plan!</h1>
        <p className="text-gray-600 mb-6">
          Your subscription is now active and ready to use. 
          Start creating amazing content right away!
        </p>

        <div className="bg-teal-50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Zap className="w-6 h-6 text-teal-600" />
            <span className="font-semibold text-teal-800 text-lg">Points Allocated</span>
          </div>
          <p className="text-3xl font-bold text-teal-600 mb-2">
            {subscriptionDetails?.points?.toLocaleString() || '1,250'} Points
          </p>
          <p className="text-sm text-teal-700">Ready to generate high-quality blog content</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">What's Next?</h3>
          <ul className="text-sm text-blue-700 space-y-1 text-left">
            <li>• Create your first post schedule</li>
            <li>• Connect your WordPress sites</li>
            <li>• Set up automated publishing</li>
            <li>• Track your content performance</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link
            to="/schedule"
            className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Create Your First Schedule</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <Link
            to="/dashboard"
            className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Subscription ID: {subscriptionId}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Need help? Contact our support team
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default PaymentSuccess