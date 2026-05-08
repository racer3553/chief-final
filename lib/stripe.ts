import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PLANS = {
  starter: { name: 'Starter', priceId: process.env.STRIPE_PRICE_STARTER!, tracks_limit: 5, cars_limit: 3 },
  pro:     { name: 'Pro',     priceId: process.env.STRIPE_PRICE_PRO!,     tracks_limit: 999, cars_limit: 10 },
  elite:   { name: 'Elite',   priceId: process.env.STRIPE_PRICE_ELITE!,   tracks_limit: 999, cars_limit: 999 },
} as const

export type PlanKey = keyof typeof PLANS

export function getPlanFromPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key as PlanKey
  }
  return null
}
