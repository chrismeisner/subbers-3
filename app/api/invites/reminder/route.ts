// File: app/api/invites/reminder/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '@/lib/airtable'

export async function POST(request: Request) {
  try {
	// 1) Parse and validate payload
	const { eventId, days, hours, mins, messageBody } = await request.json()

	if (
	  !eventId ||
	  typeof eventId !== 'string' ||
	  typeof days !== 'number' ||
	  typeof hours !== 'number' ||
	  typeof mins !== 'number' ||
	  typeof messageBody !== 'string'
	) {
	  return NextResponse.json(
		{ error: 'Invalid payload: expected { eventId: string, days: number, hours: number, mins: number, messageBody: string }' },
		{ status: 400 }
	  )
	}

	// 2) Authenticate user
	const cookieStore = await cookies()
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
	}

	// 3) Lookup the event record
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
	const eventDateStr = evFields.eventDate as string
	const eventTimeZone = evFields.eventTimeZone as string | undefined

	// 4) Compute reminder send time
	const eventDate = new Date(eventDateStr)
	const reminderMs =
	  eventDate.getTime() -
	  (days * 24 * 60 + hours * 60 + mins) * 60 * 1000
	const reminderDate = new Date(reminderMs)
	const reminderISO = reminderDate.toISOString()

	// 5) Fetch subscribers for this event
	//    we assume subscribers table has a lookup field `eventId` that mirrors the event’s eventId
	const subs = await base('subscribers')
	  .select({
		filterByFormula: `FIND("${eventId}", ARRAYJOIN({eventId}))`,
	  })
	  .firstPage()

	// 6) Create an invite for each subscriber
	const toCreate = subs.map(sub => {
	  const email = sub.get('email') as string | undefined
	  return {
		fields: {
		  email: email || '',
		  eventLink: [evRec.id],
		  subscriberLink: [sub.id],
		  status: 'New',
		  sentTime: reminderISO,
		  messageBody,
		},
	  }
	})

	if (toCreate.length === 0) {
	  return NextResponse.json(
		{ error: 'No subscribers found for this event' },
		{ status: 404 }
	  )
	}

	await base('invites').create(toCreate)

	return NextResponse.json({
	  ok: true,
	  created: toCreate.length,
	  reminderTime: reminderISO,
	})
  } catch (err: any) {
	console.error('Error creating invite reminders:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
