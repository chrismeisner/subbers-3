// File: app/api/events/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '../../../lib/airtable'
import { getStripeClient } from '@/lib/getStripeClient'

export async function GET(request: Request) {
  try {
	// 1) Read logged-in user’s email from the HttpOnly cookie
	const cookieStore = await cookies()
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
	}

	// 2) Query “events” table filtering by the emailLookup field
	const records = await base('events')
	  .select({
		filterByFormula: `{emailLookup} = "${userEmail}"`,
	  })
	  .firstPage()

	// 3) Extract and return fields including the record ID
	const events = records.map(rec => ({
	  id: rec.id,
	  ...rec.fields,
	}))
	return NextResponse.json({ data: events })
  } catch (err: any) {
	console.error('Error fetching events:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}

export async function POST(request: Request) {
  try {
	// 1) Parse and validate payload
	const { event } = await request.json()
	const {
	  name,
	  description,
	  eventDate,
	  isRecurring,
	  recurrenceInterval,
	  ticketPrice,
	  eventTimeZone,
	} = event || {}

	if (
	  typeof name !== 'string' ||
	  typeof description !== 'string' ||
	  typeof eventDate !== 'string' ||
	  typeof isRecurring !== 'boolean' ||
	  typeof recurrenceInterval !== 'string' ||
	  typeof ticketPrice !== 'number' ||
	  typeof eventTimeZone !== 'string'
	) {
	  return NextResponse.json(
		{
		  error:
			'Invalid payload: expected { event: { name: string, description: string, eventDate: string, isRecurring: boolean, recurrenceInterval: string, ticketPrice: number, eventTimeZone: string } }',
		},
		{ status: 400 }
	  )
	}

	// 2) Read logged-in user’s email
	const cookieStore = await cookies()
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
	}

	// 3) Lookup that user’s Airtable record to get their record ID
	const userRecords = await base('users')
	  .select({
		filterByFormula: `{email} = "${userEmail}"`,
		maxRecords: 1,
	  })
	  .firstPage()
	if (userRecords.length === 0) {
	  return NextResponse.json({ error: 'User not found' }, { status: 404 })
	}
	const userRecordId = userRecords[0].id

	// 4) Create the new event in Airtable (without Stripe link fields yet)
	const createdRecords = await base('events').create([
	  {
		fields: {
		  name,
		  description,
		  eventDate,
		  isRecurring,
		  recurrenceInterval,
		  ticketPrice,
		  eventTimeZone,          // ← include user's time zone
		  ownerEmail: [userRecordId],
		  inviteStatus: 'New',
		},
	  },
	])
	const airtableRecord = createdRecords[0]
	const airtableId = airtableRecord.id

	// 5) Initialize Stripe client scoped to user’s key
	const stripe = await getStripeClient()

	// 6) Create a Price object in Stripe for this event
	const priceObj = await stripe.prices.create({
	  unit_amount: Math.round(ticketPrice * 100),
	  currency: 'usd',
	  product_data: { name },
	  ...(isRecurring ? { recurring: { interval: 'month' } } : {}),
	})

	// 7) Create a Stripe Payment Link using the existing Price ID
	const paymentLink = await stripe.paymentLinks.create({
	  line_items: [
		{
		  price: priceObj.id,
		  quantity: 1,
		},
	  ],
	  after_completion: {
		type: 'redirect',
		redirect: {
		  url: `https://your-app.com/events/${airtableId}/thank-you`,
		},
	  },
	})

	// 8) Update the Airtable event record with Stripe link, priceId, and productId
	const productId =
	  typeof priceObj.product === 'string' ? priceObj.product : priceObj.product.id
	const updatedRecords = await base('events').update([
	  {
		id: airtableId,
		fields: {
		  paymentLinkId: paymentLink.id,
		  paymentLinkUrl: paymentLink.url,
		  priceId: priceObj.id,
		  productId,
		},
	  },
	])

	// 9) Grab Airtable’s own eventId (auto-generated) and return it
	const generatedEventId = (airtableRecord.fields as any).eventId as string
	return NextResponse.json({
	  data: {
		eventId: generatedEventId,
		...updatedRecords[0].fields,
	  },
	})
  } catch (err: any) {
	console.error('Error creating event with Stripe link:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
