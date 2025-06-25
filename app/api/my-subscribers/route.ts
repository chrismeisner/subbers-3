// File: app/api/my-subscribers/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '../../../lib/airtable'

export async function GET(request: Request) {
  try {
	// 1) Read logged-in user’s email from the HttpOnly cookie
	const cookieStore = await cookies()
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
	}

	// 2) Query subscribers where ownerEmail lookup equals our userEmail
	const records = await base('subscribers')
	  .select({
		filterByFormula: `{ownerEmail} = "${userEmail}"`,
		// you can also add sorting here if you like, e.g.
		// sort: [{ field: 'createdDate', direction: 'desc' }]
	  })
	  .firstPage()

	// 3) Map each record to its fields object
	const subscribers = records.map(rec => rec.fields)

	// 4) Return the subscriber list
	return NextResponse.json({ data: subscribers })
  } catch (err: any) {
	console.error('Error fetching my subscribers:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
