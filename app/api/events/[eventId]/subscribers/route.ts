// File: app/api/events/[eventId]/subscribers/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '@/lib/airtable'

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  // 1) Extract the custom eventId from the route
  const { eventId } = await context.params

  // 2) Optional authentication guard
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('userEmail')?.value
  if (!userEmail) {
	return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 3) Query the "subscribers" table by the lookup field `eventId`
  console.log(`[subscribers] Looking up subscribers for eventId="${eventId}"`)
  const records = await base('subscribers')
	.select({
	  // Assumes you have a lookup field named "eventId" in your subscribers table
	  filterByFormula: `{eventId} = "${eventId}"`,
	})
	.firstPage()

  console.log(`[subscribers] Found ${records.length} record(s)`)

  // 4) Extract and return their fields
  const data = records.map(rec => rec.fields)
  return NextResponse.json({ data })
}
