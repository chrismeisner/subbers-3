// File: app/api/zoom/disconnect/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '@/lib/airtable'

export async function POST() {
  // 1) Read logged-in user’s email from the HttpOnly cookie
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('userEmail')?.value
  if (!userEmail) {
	return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 2) Lookup the Airtable user record
  const [userRec] = await base('users')
	.select({
	  filterByFormula: `{email} = "${userEmail}"`,
	  maxRecords: 1,
	})
	.firstPage()

  if (!userRec) {
	return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 3) Clear the Zoom tokens fields on the user record
  try {
	await base('users').update([
	  {
		id: userRec.id,
		fields: {
		  zoomAccessToken: '',
		  zoomRefreshToken: '',
		  zoomTokenExpires: '',
		},
	  },
	])
	return NextResponse.json({ ok: true })
  } catch (err: any) {
	console.error('[Zoom Disconnect] Error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
