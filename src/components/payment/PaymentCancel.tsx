import React from 'react'
import { motion } from 'framer-motion'
import { X, ArrowLeft, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'

const PaymentCancel: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <X className="w-12 h-12 text-orange-600" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">
          No worries! Your payment was cancelled and no charges were made to your account.
        </p>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Still interested?</h3>
          <p className="text-sm text-blue-700">
            You can upgrade your plan anytime from your dashboard. 
            All our plans come with a 30-day money-back guarantee.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          
          <Link
            to="/dashboard"
            className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Questions? Contact our support team for assistance.
        </p>
      </motion.div>
    </div>
  )
}

export default PaymentCancel