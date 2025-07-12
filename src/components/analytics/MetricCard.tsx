import React from 'react'
import { motion } from 'framer-motion'
import { DivideIcon as LucideIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  change: string
  icon: LucideIcon
  color: string
  trend?: 'up' | 'down' | 'neutral'
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  trend = 'neutral'
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {getTrendIcon()}
        <p className={`text-sm ${getTrendColor()}`}>{change}</p>
      </div>
    </motion.div>
  )
}

export default MetricCard