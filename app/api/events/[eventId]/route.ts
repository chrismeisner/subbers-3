// File: app/api/events/[eventId]/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '../../../../lib/airtable'
import { getStripeClient } from '@/lib/getStripeClient'

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
	// await the incoming params promise
	const { eventId } = await context.params

	// 1) Read logged-in user’s email from the HttpOnly cookie
	const cookieStore = await cookies()
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
	}

	// 2) Lookup the event
	const records = await base('events')
	  .select({
		filterByFormula: `{eventId} = "${eventId}"`,
		maxRecords: 1,
	  })
	  .firstPage()
	if (records.length === 0) {
	  return NextResponse.json({ error: 'Event not found' }, { status: 404 })
	}
	const record = records[0]
	const f = record.fields as any

	// 3) Verify ownership
	const owners = f.ownerEmail as string[] | undefined
	const userRecs = await base('users')
	  .select({
		filterByFormula: `{email} = "${userEmail}"`,
		maxRecords: 1,
	  })
	  .firstPage()
	const userRecordId = userRecs[0]?.id
	if (!owners || !userRecordId || !owners.includes(userRecordId)) {
	  return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
	}

	// 4) Return
	return NextResponse.json({
	  data: {
		eventId: f.eventId as string,
		name: f.name as string,
		description: f.description as string,
		eventDate: f.eventDate as string,
		isRecurring: f.isRecurring as boolean,
		recurrenceInterval: f.recurrenceInterval as string,
		ticketPrice: f.ticketPrice as number,
		paymentLinkId: f.paymentLinkId as string | undefined,
		paymentLinkUrl: f.paymentLinkUrl as string | undefined,
		priceId: f.priceId as string | undefined,
		productId: f.productId as string | undefined,
		eventTimeZone: f.eventTimeZone as string | undefined,
	  },
	})
  } catch (err: any) {
	console.error('Error fetching event:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
	// await the incoming params promise
	const { eventId } = await context.params

	// 1) Validate body
	const { name, description, eventDate, recurrenceInterval, eventTimeZone } =
	  await request.json()

	if (
	  (name !== undefined && typeof name !== 'string') ||
	  (description !== undefined && typeof description !== 'string') ||
	  (eventDate !== undefined && typeof eventDate !== 'string') ||
	  (recurrenceInterval !== undefined && typeof recurrenceInterval !== 'string') ||
	  (eventTimeZone !== undefined && typeof eventTimeZone !== 'string')
	) {
	  return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
	}

	// 2) Authenticate
	const cookieStore = await cookies()
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
	}

	// 3) Lookup user record
	const userRecs = await base('users')
	  .select({
		filterByFormula: `{email} = "${userEmail}"`,
		maxRecords: 1,
	  })
	  .firstPage()
	if (userRecs.length === 0) {
	  return NextResponse.json({ error: 'User not found' }, { status: 404 })
	}
	const userRecordId = userRecs[0].id

	// 4) Lookup event
	const evRecs = await base('events')
	  .select({
		filterByFormula: `{eventId} = "${eventId}"`,
		maxRecords: 1,
	  })
	  .firstPage()
	if (evRecs.length === 0) {
	  return NextResponse.json({ error: 'Event not found' }, { status: 404 })
	}
	const evRec = evRecs[0]
	const evFields = evRec.fields as any

	// 5) Verify ownership
	const owners = evFields.ownerEmail as string[] | undefined
	if (!owners || !owners.includes(userRecordId)) {
	  return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
	}

	// 6) Build update
	const updateFields: Record<string, any> = {}
	if (name !== undefined) updateFields.name = name
	if (description !== undefined) updateFields.description = description
	if (eventDate !== undefined) updateFields.eventDate = eventDate
	if (recurrenceInterval !== undefined) updateFields.recurrenceInterval = recurrenceInterval
	if (eventTimeZone !== undefined) updateFields.eventTimeZone = eventTimeZone

	// 7) Update Airtable
	const [updated] = await base('events').update([
	  { id: evRec.id, fields: updateFields },
	])

	// 8) Sync Stripe name if needed
	if (name !== undefined && evFields.productId) {
	  const stripe = await getStripeClient()
	  await stripe.products.update(evFields.productId, { name })
	}

	// 9) Return updated fields
	return NextResponse.json({ data: updated.fields })
  } catch (err: any) {
	console.error('Error updating event:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
