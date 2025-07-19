import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Zap, Crown, Rocket, Star } from 'lucide-react'
import { paypalService } from '../../lib/paypal'
import { useAuth } from '../../contexts/AuthContext'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState('')

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      price: 0,
      period: 'forever',
      points: 50,
      posts: '3-4 posts',
      icon: Zap,
      color: 'bg-gray-600',
      popular: false,
      features: [
        '50 points/month',
        '1 WordPress site',
        'Basic templates',
        '500-1000 words',
        'Email support',
        'Standard AI content'
      ]
    },
    {
      id: 'pro',
      name: 'Creator',
      price: 29,
      period: 'month',
      points: 1250,
      posts: '80+ posts',
      icon: Crown,
      color: 'bg-teal-600',
      popular: true,
      features: [
        '1,250 points/month',
        '3 WordPress sites',
        'All content types',
        'Up to 2000 words',
        'Advanced scheduling',
        'Priority support',
        'Content humanization',
        'Featured images'
      ]
    },
    {
      id: 'business',
      name: 'Agency',
      price: 79,
      period: 'month',
      points: 3500,
      posts: '230+ posts',
      icon: Rocket,
      color: 'bg-purple-600',
      popular: false,
      features: [
        '3,500 points/month',
        '10 WordPress sites',
        'White-label options',
        'Up to 3000 words',
        'API access',
        'Custom integrations',
        'Phone + chat support',
        'Advanced analytics'
      ]
    },
    {
      id: 'enterprise',
      name: 'Scale',
      price: 199,
      period: 'month',
      points: 10000,
      posts: '650+ posts',
      icon: Star,
      color: 'bg-orange-600',
      popular: false,
      features: [
        '10,000 points/month',
        'Unlimited sites',
        'Custom AI training',
        'Unlimited words',
        'Dedicated manager',
        'Custom features',
        'SLA guarantee',
        'Enterprise security'
      ]
    }
  ]

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      // Handle free plan - just close modal
      onClose()
      return
    }

    if (!user) {
      setError('Please sign in to upgrade your plan')
      return
    }

    setLoading(planId)
    setError('')

    try {
      const result = await paypalService.createSubscription({
        planId,
        userEmail: user.email || '',
        userName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'User'
      })

      if (result.success && result.approvalUrl) {
        // Redirect to PayPal for approval
        window.location.href = result.approvalUrl
      } else {
        setError(result.error || 'Failed to create subscription')
      }
    } catch (err) {
      setError('An error occurred while processing your request')
      console.error('Payment error:', err)
    } finally {
      setLoading(null)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Choose Your Plan</h2>
                <p className="text-gray-600 mt-2">Scale your content creation with the perfect plan for your needs</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Pricing Cards */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <motion.div
                  key={plan.id}
                  whileHover={{ scale: 1.02 }}
                  className={`relative bg-white border-2 rounded-xl p-6 ${
                    plan.popular ? 'border-teal-500 shadow-lg' : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-teal-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`w-12 h-12 ${plan.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                      <plan.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-gray-800">${plan.price}</span>
                      {plan.price > 0 && <span className="text-gray-500">/{plan.period}</span>}
                    </div>
                    <p className="text-sm text-gray-600">{plan.posts}</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === plan.id ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      plan.price === 0 ? 'Get Started Free' : 'Choose Plan'
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </div>

            {/* Features Comparison */}
            <div className="mt-12 bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">All Plans Include</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-teal-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">AI-Powered Content</h4>
                  <p className="text-sm text-gray-600">Advanced AI generates high-quality, SEO-optimized blog posts</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Crown className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">WordPress Integration</h4>
                  <p className="text-sm text-gray-600">Seamless publishing directly to your WordPress sites</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Rocket className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Smart Scheduling</h4>
                  <p className="text-sm text-gray-600">Automated posting with intelligent scheduling options</p>
                </div>
              </div>
            </div>

            {/* Money Back Guarantee */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                💰 <strong>30-day money-back guarantee</strong> • Cancel anytime • No setup fees
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}


export default PricingModal