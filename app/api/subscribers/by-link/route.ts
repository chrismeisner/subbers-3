// File: app/api/subscribers/by-link/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/getStripeClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const linkId = searchParams.get('linkId')
  if (!linkId) {
	return NextResponse.json(
	  { error: 'Missing linkId query param' },
	  { status: 400 }
	)
  }

  try {
	const stripe = await getStripeClient()

	// 1) List all Checkout Sessions for this Payment Link
	const sessions = await stripe.checkout.sessions.list({
	  payment_link: linkId,
	  limit: 100,
	})

	// 2) Filter to only those that succeeded
	const paid = sessions.data.filter(s => s.payment_status === 'paid')

	// 3) Map into a simple subscriber shape
	const subscribers = paid.map(s => ({
	  sessionId: s.id,
	  email: s.customer_details?.email,
	  customerId: typeof s.customer === 'string' ? s.customer : undefined,
	  subscriptionId:
		typeof s.subscription === 'string'
		  ? s.subscription
		  : s.subscription?.id,
	  created: new Date(s.created * 1000).toISOString(),
	}))

	return NextResponse.json({ data: subscribers })
  } catch (err: any) {
	console.error('By-link lookup error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
