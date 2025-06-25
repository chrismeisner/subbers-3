// File: app/api/zoom/me/route.ts

import { NextRequest, NextResponse } from 'next/server'
import Airtable from 'airtable'
import { getCurrentUser } from '../../../../lib/session'  // adjust path as needed

// Configure Airtable client
Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY })
const base = Airtable.base(process.env.AIRTABLE_BASE_ID!)

export async function GET(req: NextRequest) {
  try {
	// 1) Ensure user is signed in
	const user = await getCurrentUser()
	if (!user) {
	  return NextResponse.json(
		{ error: 'Not authenticated' },
		{ status: 401 }
	  )
	}

	// 2) Lookup the Airtable record for this user
	const records = await base('Users')
	  .select({
		filterByFormula: `{id} = '${user.id}'`,
		maxRecords: 1,
	  })
	  .firstPage()

	if (records.length === 0) {
	  return NextResponse.json(
		{ error: 'User record not found' },
		{ status: 404 }
	  )
	}

	const record = records[0]
	const zoomAccessToken = (record.get('zoomAccessToken') as string) || null
	const zoomRefreshToken = (record.get('zoomRefreshToken') as string) || null

	// 3) Return the stored tokens and a simple "connected" flag
	return NextResponse.json({
	  connected: Boolean(zoomAccessToken),
	  zoomAccessToken,
	  zoomRefreshToken,
	})
  } catch (err) {
	console.error('Error in /api/zoom/me:', err)
	return NextResponse.json(
	  { error: 'Internal server error' },
	  { status: 500 }
	)
  }
}
