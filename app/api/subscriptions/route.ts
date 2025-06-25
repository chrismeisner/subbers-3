// File: app/api/subscriptions/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/getStripeClient'

export async function GET(request: Request) {
  try {
	const stripe = await getStripeClient()
	const { searchParams } = new URL(request.url)

	const limit = Number(searchParams.get('limit') ?? '100')
	const startingAfter = searchParams.get('starting_after') || undefined
	const productIdFilter = searchParams.get('productId')!

	// 1) Fetch a page of subscriptions
	const list = await stripe.subscriptions.list({
	  limit,
	  starting_after: startingAfter,
	})

	// 2) Server‐side filter by the selected product ID (not price ID)
	const subs = list.data.filter(sub => {
	  const raw = sub.items.data[0].price.product
	  const prodId = typeof raw === 'string' ? raw : raw.id
	  return prodId === productIdFilter
	})

	// 3) Look up the product name once (if we have any subscriptions)
	let productName = 'Unknown Product'
	if (subs.length) {
	  const raw = subs[0].items.data[0].price.product
	  const prodId = typeof raw === 'string' ? raw : raw.id
	  const product = await stripe.products.retrieve(prodId)
	  productName = product.name
	}

	// 4) Inject the productName onto each subscription item
	subs.forEach(sub => {
	  sub.items.data.forEach(item => {
		const raw = item.price.product
		const id = typeof raw === 'string' ? raw : raw.id
		// @ts-ignore: override the union to include our name
		item.price.product = { id, name: productName }
	  })
	})

	// 5) Return filtered data with Stripe's cursor for pagination
	return NextResponse.json({
	  data: subs,
	  has_more: list.has_more,
	  next_starting_after: list.has_more
		? list.data[list.data.length - 1].id
		: null,
	})
  } catch (err: any) {
	console.error('Stripe subscriptions error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
