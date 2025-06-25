// File: app/api/payment-links/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/getStripeClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  if (!productId) {
	return NextResponse.json(
	  { error: 'Missing productId query param' },
	  { status: 400 }
	)
  }

  try {
	const stripe = await getStripeClient()

	// List payment links and expand line_items to inspect their prices
	const paymentLinks = await stripe.paymentLinks.list({
	  limit: 100,
	  expand: ['data.line_items'],
	})
	console.log('🔗 Retrieved paymentLinks count:', paymentLinks.data.length)

	// Find the first link whose line_items contain our productId
	const match = paymentLinks.data.find(pl => {
	  const items = pl.line_items?.data || []
	  return items.some(item => {
		const raw = item.price.product
		const pid = typeof raw === 'string' ? raw : raw.id
		return pid === productId
	  })
	})

	if (!match) {
	  console.warn('⚠️ No payment link found for productId:', productId)
	  return NextResponse.json(
		{ data: null, message: 'No payment link found for that product' },
		{ status: 200 }
	  )
	}

	// Extract the associated Price ID from the first line item
	const firstItem = match.line_items?.data[0]
	const priceId = firstItem?.price.id
	console.log('✅ Payment link matched:', match.id, 'priceId:', priceId)

	return NextResponse.json({
	  data: {
		paymentLinkId: match.id,
		paymentLinkUrl: match.url,
		priceId,
	  },
	})
  } catch (err: any) {
	console.error('Payment-Links lookup error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
