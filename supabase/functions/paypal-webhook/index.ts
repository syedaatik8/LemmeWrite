// PayPal Webhook Handler for Payment Processing
// This function handles PayPal webhook events for subscription payments

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayPalWebhookEvent {
  id: string
  event_type: string
  resource_type: string
  summary: string
  resource: {
    id: string
    status: string
    subscriber?: {
      email_address: string
      payer_id: string
    }
    plan_id?: string
    billing_info?: {
      next_billing_time: string
      cycle_executions: Array<{
        tenure_type: string
        sequence: number
        cycles_completed: number
        cycles_remaining: number
      }>
    }
  }
  create_time: string
  event_version: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the webhook payload
    const webhookEvent: PayPalWebhookEvent = await req.json()
    
    console.log('PayPal Webhook Event:', webhookEvent.event_type)
    console.log('Event ID:', webhookEvent.id)
    console.log('Resource:', webhookEvent.resource)

    // Handle different PayPal events
    switch (webhookEvent.event_type) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        await handleSubscriptionCreated(supabaseClient, webhookEvent)
        break
        
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(supabaseClient, webhookEvent)
        break
        
      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(supabaseClient, webhookEvent)
        break
        
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(supabaseClient, webhookEvent)
        break
        
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(supabaseClient, webhookEvent)
        break
        
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handlePaymentFailed(supabaseClient, webhookEvent)
        break
        
      default:
        console.log('Unhandled event type:', webhookEvent.event_type)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        event_type: webhookEvent.event_type 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing PayPal webhook:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleSubscriptionCreated(supabase: any, event: PayPalWebhookEvent) {
  console.log('Processing subscription created event')
  
  const { resource } = event
  const email = resource.subscriber?.email_address
  const paypalSubscriptionId = resource.id
  const planId = resource.plan_id

  if (!email) {
    console.error('No email found in subscription created event')
    return
  }

  // Find user by email
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (userError || !user) {
    console.error('User not found for email:', email)
    return
  }

  // Map PayPal plan ID to our plan
  const planMapping = {
    'P-5ML4271244454362WXNWU5NQ': 'pro',    // $29/month
    'P-1GJ4899448696344MXNWU5NQ': 'business', // $79/month
    'P-2RT4271244454362WXNWU5NQ': 'enterprise' // $199/month
  }

  const planType = planMapping[planId] || 'free'

  // Create subscription record
  const { error: subError } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: user.id,
      plan_type: planType,
      paypal_subscription_id: paypalSubscriptionId,
      status: 'created',
      created_at: new Date().toISOString()
    })

  if (subError) {
    console.error('Error creating subscription record:', subError)
  }
}

async function handleSubscriptionActivated(supabase: any, event: PayPalWebhookEvent) {
  console.log('Processing subscription activated event')
  
  const { resource } = event
  const paypalSubscriptionId = resource.id

  // Update subscription status
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ 
      status: 'active',
      activated_at: new Date().toISOString()
    })
    .eq('paypal_subscription_id', paypalSubscriptionId)

  if (error) {
    console.error('Error activating subscription:', error)
    return
  }

  // Allocate points based on plan
  await allocatePointsForSubscription(supabase, paypalSubscriptionId)
}

async function handlePaymentCompleted(supabase: any, event: PayPalWebhookEvent) {
  console.log('Processing payment completed event')
  
  const { resource } = event
  const paypalSubscriptionId = resource.id

  // Get subscription details
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_type')
    .eq('paypal_subscription_id', paypalSubscriptionId)
    .single()

  if (subError || !subscription) {
    console.error('Subscription not found for payment:', paypalSubscriptionId)
    return
  }

  // Allocate points for the new billing cycle
  await allocatePointsForSubscription(supabase, paypalSubscriptionId)

  // Log payment
  const { error: paymentError } = await supabase
    .from('payment_history')
    .insert({
      user_id: subscription.user_id,
      paypal_subscription_id: paypalSubscriptionId,
      event_type: 'payment_completed',
      amount: getAmountForPlan(subscription.plan_type),
      currency: 'USD',
      created_at: new Date().toISOString()
    })

  if (paymentError) {
    console.error('Error logging payment:', paymentError)
  }
}

async function handleSubscriptionCancelled(supabase: any, event: PayPalWebhookEvent) {
  console.log('Processing subscription cancelled event')
  
  const { resource } = event
  const paypalSubscriptionId = resource.id

  // Update subscription status
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ 
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('paypal_subscription_id', paypalSubscriptionId)

  if (error) {
    console.error('Error cancelling subscription:', error)
  }
}

async function handleSubscriptionSuspended(supabase: any, event: PayPalWebhookEvent) {
  console.log('Processing subscription suspended event')
  
  const { resource } = event
  const paypalSubscriptionId = resource.id

  // Update subscription status
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ 
      status: 'suspended',
      suspended_at: new Date().toISOString()
    })
    .eq('paypal_subscription_id', paypalSubscriptionId)

  if (error) {
    console.error('Error suspending subscription:', error)
  }
}

async function handlePaymentFailed(supabase: any, event: PayPalWebhookEvent) {
  console.log('Processing payment failed event')
  
  const { resource } = event
  const paypalSubscriptionId = resource.id

  // Get subscription details
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('paypal_subscription_id', paypalSubscriptionId)
    .single()

  if (subError || !subscription) {
    console.error('Subscription not found for failed payment:', paypalSubscriptionId)
    return
  }

  // Log failed payment
  const { error: paymentError } = await supabase
    .from('payment_history')
    .insert({
      user_id: subscription.user_id,
      paypal_subscription_id: paypalSubscriptionId,
      event_type: 'payment_failed',
      created_at: new Date().toISOString()
    })

  if (paymentError) {
    console.error('Error logging failed payment:', paymentError)
  }
}

async function allocatePointsForSubscription(supabase: any, paypalSubscriptionId: string) {
  console.log('Starting points allocation for subscription:', paypalSubscriptionId)
  
  // Get subscription details
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_type')
    .eq('paypal_subscription_id', paypalSubscriptionId)
    .single()

  if (subError || !subscription) {
    console.error('Subscription not found for points allocation:', paypalSubscriptionId)
    return
  }

  console.log('Found subscription for user:', subscription.user_id, 'plan:', subscription.plan_type)
  
  // Points allocation based on plan
  const pointsAllocation = {
    'free': 50,
    'pro': 1250,
    'business': 3500,
    'enterprise': 10000
  }

  const points = pointsAllocation[subscription.plan_type] || 50

  // Use atomic allocation function to prevent duplicates
  const { data: allocationSuccess, error: transactionError } = await supabase.rpc('allocate_points_with_history', {
    target_user_id: subscription.user_id,
    points_to_add: points,
    subscription_id: paypalSubscriptionId,
    plan_amount: getAmountForPlan(subscription.plan_type)
  })

  if (transactionError) {
    console.error('Error in points allocation transaction:', transactionError)
    return
  }

  if (allocationSuccess) {
    console.log(`Successfully allocated ${points} points to user ${subscription.user_id}`)
  } else {
    console.log(`Points already allocated for subscription ${paypalSubscriptionId} - duplicate prevented`)
  }
}

// Alternative implementation without the RPC function (if the above doesn't work)
async function allocatePointsForSubscriptionFallback(supabase: any, paypalSubscriptionId: string) {
  console.log('Starting points allocation for subscription:', paypalSubscriptionId)
  
  // Get subscription details
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_type')
    .eq('paypal_subscription_id', paypalSubscriptionId)
    .single()

  if (subError || !subscription) {
    console.error('Subscription not found for points allocation:', paypalSubscriptionId)
    return
  }

  console.log('Found subscription for user:', subscription.user_id, 'plan:', subscription.plan_type)
  
  // Check if points were already allocated for this subscription
  const { data: existingAllocations, error: allocationError } = await supabase
    .from('payment_history')
    .select('id, event_type, created_at, amount')
    .eq('user_id', subscription.user_id)
    .eq('paypal_subscription_id', paypalSubscriptionId)
    .in('event_type', ['webhook_points_allocation', 'manual_points_allocation', 'subscription_activated', 'payment_completed'])

  if (allocationError) {
    console.error('Error checking existing allocation:', allocationError)
    return
  }

  if (existingAllocations && existingAllocations.length > 0) {
    console.log(`Points already allocated for subscription ${paypalSubscriptionId}. Found ${existingAllocations.length} existing records:`, existingAllocations)
    return
  }

  console.log('No existing allocations found, proceeding with points allocation')
  
  // Points allocation based on plan
  const pointsAllocation = {
    'free': 50,
    'pro': 1250,
    'business': 3500,
    'enterprise': 10000
  }

  const points = pointsAllocation[subscription.plan_type] || 50

  // Use the RPC function to safely add points
  const { data: newTotal, error: pointsError } = await supabase
    .rpc('add_points_to_user', {
      target_user_id: subscription.user_id,
      points_to_add: points
    })

  if (pointsError) {
    console.error('Error allocating points:', pointsError)
    return
  } else {
    console.log(`Added ${points} points to user ${subscription.user_id}. New total: ${newTotal}`)
    
    // Log this allocation in payment history to prevent duplicates
    await supabase
      .from('payment_history')
      .insert({
        user_id: subscription.user_id,
        paypal_subscription_id: paypalSubscriptionId,
        event_type: 'webhook_points_allocation',
        amount: getAmountForPlan(subscription.plan_type),
        currency: 'USD',
        created_at: new Date().toISOString()
      })
  }
}

function getAmountForPlan(planType: string): number {
  const amounts = {
    'free': 0,
    'pro': 29,
    'business': 79,
    'enterprise': 199
  }
  return amounts[planType] || 0
}