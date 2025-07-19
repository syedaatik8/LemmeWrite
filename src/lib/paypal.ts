// PayPal Integration Service
// Handles PayPal subscription creation and management

interface PayPalPlan {
  id: string
  name: string
  description: string
  price: number
  interval: 'MONTH'
  intervalCount: 1
}

interface PayPalSubscriptionRequest {
  planId: string
  userEmail: string
  userName: string
}

interface PayPalSubscriptionResponse {
  success: boolean
  subscriptionId?: string
  approvalUrl?: string
  error?: string
}

class PayPalService {
  private clientId: string
  private clientSecret: string
  private environment: 'sandbox' | 'live'
  private baseUrl: string

  constructor() {
    this.clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID
    this.clientSecret = import.meta.env.VITE_PAYPAL_CLIENT_SECRET
    this.environment = import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox'
    this.baseUrl = this.environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'

    if (!this.clientId || !this.clientSecret) {
      console.error('PayPal credentials not configured')
    }
  }

  // PayPal plan configurations
  private plans: Record<string, PayPalPlan> = {
    pro: {
      id: 'TEMP_PRO_PLAN', // Temporary - will be created dynamically
      name: 'Creator Plan',
      description: '1,250 points per month for content creators',
      price: 29,
      interval: 'MONTH',
      intervalCount: 1
    },
    business: {
      id: 'TEMP_BUSINESS_PLAN', // Temporary - will be created dynamically
      name: 'Agency Plan', 
      description: '3,500 points per month for agencies',
      price: 79,
      interval: 'MONTH',
      intervalCount: 1
    },
    enterprise: {
      id: 'TEMP_ENTERPRISE_PLAN', // Temporary - will be created dynamically
      name: 'Scale Plan',
      description: '10,000 points per month for enterprises',
      price: 199,
      interval: 'MONTH',
      intervalCount: 1
    }
  }

  async getAccessToken(): Promise<string> {
    try {
      const auth = btoa(`${this.clientId}:${this.clientSecret}`)
      
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      })

      if (!response.ok) {
        throw new Error(`PayPal auth failed: ${response.status}`)
      }

      const data = await response.json()
      return data.access_token
    } catch (error) {
      console.error('PayPal authentication error:', error)
      throw error
    }
  }

  async createProduct(plan: PayPalPlan): Promise<string> {
    try {
      const accessToken = await this.getAccessToken()
      
      const productData = {
        name: plan.name,
        description: plan.description,
        type: 'SERVICE',
        category: 'SOFTWARE'
      }

      const response = await fetch(`${this.baseUrl}/v1/catalogs/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      })

      if (!response.ok) {
        throw new Error(`Product creation failed: ${response.status}`)
      }

      const product = await response.json()
      return product.id
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  }

  async createPlan(plan: PayPalPlan, productId: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken()
      
      const planData = {
        product_id: productId,
        name: plan.name,
        description: plan.description,
        billing_cycles: [
          {
            frequency: {
              interval_unit: plan.interval,
              interval_count: plan.intervalCount
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite cycles
            pricing_scheme: {
              fixed_price: {
                value: plan.price.toString(),
                currency_code: 'USD'
              }
            }
          }
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3
        }
      }

      const response = await fetch(`${this.baseUrl}/v1/billing/plans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planData)
      })

      if (!response.ok) {
        throw new Error(`Plan creation failed: ${response.status}`)
      }

      const createdPlan = await response.json()
      return createdPlan.id
    } catch (error) {
      console.error('Error creating plan:', error)
      throw error
    }
  }

  async getOrCreatePlanId(planKey: string): Promise<string> {
    const plan = this.plans[planKey]
    if (!plan) {
      throw new Error('Invalid plan selected')
    }

    // If it's a temporary ID, create the plan dynamically
    if (plan.id.startsWith('TEMP_')) {
      try {
        const productId = await this.createProduct(plan)
        const planId = await this.createPlan(plan, productId)
        
        // Update the stored plan ID for future use
        this.plans[planKey].id = planId
        
        return planId
      } catch (error) {
        console.error('Failed to create PayPal plan:', error)
        throw new Error('Failed to create subscription plan. Please try again.')
      }
    }

    return plan.id
  }

  async createSubscription(request: PayPalSubscriptionRequest): Promise<PayPalSubscriptionResponse> {
    try {
      const accessToken = await this.getAccessToken()
      const plan = this.plans[request.planId]

      if (!plan) {
        return { success: false, error: 'Invalid plan selected' }
      }

      // Get or create the plan ID
      const planId = await this.getOrCreatePlanId(request.planId)

      const subscriptionData = {
        plan_id: planId,
        subscriber: {
          name: {
            given_name: request.userName.split(' ')[0] || 'User',
            surname: request.userName.split(' ').slice(1).join(' ') || 'Account'
          },
          email_address: request.userEmail
        },
        application_context: {
          brand_name: 'LemmeWrite',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: `${window.location.origin}/payment/success`,
          cancel_url: `${window.location.origin}/payment/cancel`
        }
      }

      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(subscriptionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('PayPal subscription creation failed:', errorData)
        return { success: false, error: errorData.message || 'Subscription creation failed' }
      }

      const subscription = await response.json()
      const approvalUrl = subscription.links.find((link: any) => link.rel === 'approve')?.href

      return {
        success: true,
        subscriptionId: subscription.id,
        approvalUrl
      }
    } catch (error) {
      console.error('PayPal subscription error:', error)
      return { success: false, error: error.message }
    }
  }

  async getSubscriptionDetails(subscriptionId: string) {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get subscription details: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting subscription details:', error)
      throw error
    }
  }

  async cancelSubscription(subscriptionId: string, reason: string = 'User requested cancellation') {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason
        })
      })

      return response.ok
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      return false
    }
  }

  getPlanDetails(planId: string): PayPalPlan | null {
    return this.plans[planId] || null
  }

  getAllPlans(): PayPalPlan[] {
    return Object.values(this.plans)
  }
}

export const paypalService = new PayPalService()
export type { PayPalSubscriptionRequest, PayPalSubscriptionResponse, PayPalPlan }