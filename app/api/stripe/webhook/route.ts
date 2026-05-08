import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, PLANS, getPlanFromPriceId } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  async function updateProfile(customerId: string, updates: Record<string, any>) {
    await supabase.from('profiles').update(updates).eq('stripe_customer_id', customerId)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      const plan = session.metadata?.plan as string
      const planConfig = PLANS[plan as keyof typeof PLANS]

      if (userId && planConfig) {
        await supabase.from('profiles').update({
          plan,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'trialing',
          tracks_limit: planConfig.tracks_limit,
          cars_limit: planConfig.cars_limit,
        }).eq('id', userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id
      const plan = priceId ? getPlanFromPriceId(priceId) : null
      const planConfig = plan ? PLANS[plan] : null

      await updateProfile(sub.customer as string, {
        subscription_status: sub.status,
        ...(plan && planConfig ? {
          plan,
          tracks_limit: planConfig.tracks_limit,
          cars_limit: planConfig.cars_limit,
        } : {}),
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await updateProfile(sub.customer as string, {
        plan: 'trial',
        subscription_status: 'canceled',
        stripe_subscription_id: null,
        tracks_limit: 3,
        cars_limit: 2,
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await updateProfile(invoice.customer as string, {
        subscription_status: 'past_due',
      })
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      await updateProfile(invoice.customer as string, {
        subscription_status: 'active',
      })
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
