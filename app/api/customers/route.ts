// File: app/api/customers/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/getStripeClient'

export async function GET(request: Request) {
  try {
	// Initialize Stripe using the logged-in user's key
	const stripe = await getStripeClient()

	const { searchParams } = new URL(request.url)
	const email = searchParams.get('email')
	const customerId = searchParams.get('customerId')

	if (customerId) {
	  const customer = await stripe.customers.retrieve(customerId)
	  return NextResponse.json({ data: customer })
	}

	if (email) {
	  const list = await stripe.customers.list({ email })
	  return NextResponse.json({ data: list.data })
	}

	return NextResponse.json(
	  { error: 'Provide email or customerId' },
	  { status: 400 }
	)
  } catch (err: any) {
	console.error('Stripe customers error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
