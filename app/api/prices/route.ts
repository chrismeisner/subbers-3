// File: app/api/prices/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/getStripeClient'

export async function GET(req: Request) {
  try {
	// Initialize Stripe using the logged-in user’s key
	const stripe = await getStripeClient()

	// 1) Fetch up to 100 active recurring prices, expanding product
	const prices = await stripe.prices.list({
	  active: true,
	  type: 'recurring',
	  limit: 100,
	  expand: ['data.product'],
	})

	// 2) Map into option objects, including productId
	const rawOptions = prices.data.map(p => {
	  const name =
		p.nickname ??
		(typeof p.product !== 'string' ? p.product.name : p.product)
	  const productId =
		typeof p.product === 'string' ? p.product : p.product.id

	  return {
		value: name,
		label: name,
		priceId: p.id,
		productId,                // ← new field
	  }
	})

	// 3) Dedupe by `value`, keeping the first occurrence
	const seen = new Set<string>()
	const options = rawOptions.filter(opt => {
	  if (seen.has(opt.value)) return false
	  seen.add(opt.value)
	  return true
	})

	return NextResponse.json({ options })
  } catch (err: any) {
	console.error('Stripe prices error:', err)
	return NextResponse.json(
	  { options: [], error: err.message },
	  { status: 500 }
	)
  }
}
