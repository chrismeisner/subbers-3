// File: app/api/zoom/status/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '@/lib/airtable'
import fetch from 'node-fetch'

export async function GET() {
  // 1) Read logged-in user’s email from the HttpOnly cookie
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('userEmail')?.value
  if (!userEmail) {
	return NextResponse.json({ connected: false }, { status: 200 })
  }

  // 2) Lookup the user record in Airtable
  const [userRec] = await base('users')
	.select({
	  filterByFormula: `{email} = "${userEmail}"`,
	  maxRecords: 1,
	})
	.firstPage()

  if (!userRec) {
	return NextResponse.json({ connected: false }, { status: 200 })
  }

  // 3) Check for stored Zoom tokens
  const { zoomAccessToken, zoomRefreshToken, zoomTokenExpires } = userRec.fields as any

  if (!zoomAccessToken || !zoomRefreshToken || !zoomTokenExpires) {
	return NextResponse.json({ connected: false }, { status: 200 })
  }

  // 4) Optionally verify the access token is still valid
  let valid = false
  let zoomUser: { id: string; email?: string; first_name?: string; last_name?: string } | null = null
  try {
	const res = await fetch('https://api.zoom.us/v2/users/me', {
	  headers: {
		Authorization: `Bearer ${zoomAccessToken}`,
		'Content-Type': 'application/json',
	  },
	})
	if (res.ok) {
	  valid = true
	  zoomUser = await res.json()
	}
  } catch (err) {
	console.error('[Zoom Status] Token verification failed:', err)
  }

  // 5) Return status
  return NextResponse.json(
	{
	  connected: valid,
	  expiresAt: zoomTokenExpires,
	  user: valid
		? {
			id: zoomUser?.id,
			email: zoomUser?.email ?? null,
			name:
			  zoomUser?.first_name && zoomUser?.last_name
				? `${zoomUser.first_name} ${zoomUser.last_name}`
				: null,
		  }
		: null,
	},
	{ status: 200 }
  )
}
