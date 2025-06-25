// File: app/api/zoom/callback/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '@/lib/airtable'
import fetch from 'node-fetch'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const returnedState = searchParams.get('state')
  const code = searchParams.get('code')

  // 1) Verify CSRF state
  const cookieStore = await cookies()
  const storedState = cookieStore.get('zoom_oauth_state')?.value
  if (!returnedState || returnedState !== storedState) {
	return NextResponse.json(
	  { error: 'Invalid or missing CSRF state' },
	  { status: 400 }
	)
  }

  // 2) Ensure we have an authorization code
  if (!code) {
	return NextResponse.json(
	  { error: 'Missing authorization code' },
	  { status: 400 }
	)
  }

  try {
	// 3) Exchange code for tokens
	const tokenUrl = `https://zoom.us/oauth/token?grant_type=authorization_code&code=${encodeURIComponent(
	  code
	)}&redirect_uri=${encodeURIComponent(process.env.ZOOM_REDIRECT_URI!)}`
	const basicAuth = Buffer.from(
	  `${process.env.ZOOM_CLIENT_ID!}:${process.env.ZOOM_CLIENT_SECRET!}`
	).toString('base64')

	const tokenRes = await fetch(tokenUrl, {
	  method: 'POST',
	  headers: {
		Authorization: `Basic ${basicAuth}`,
	  },
	})
	const tokenData = await tokenRes.json()
	if (!tokenData.access_token) {
	  throw new Error('No access token returned from Zoom')
	}

	const { access_token, refresh_token, expires_in } = tokenData
	const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

	// 4) Identify the logged-in user
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  return NextResponse.json(
		{ error: 'Not authenticated' },
		{ status: 401 }
	  )
	}

	// 5) Persist Zoom tokens in Airtable
	const [userRec] = await base('users')
	  .select({
		filterByFormula: `{email} = "${userEmail}"`,
		maxRecords: 1,
	  })
	  .firstPage()

	if (!userRec) {
	  return NextResponse.json(
		{ error: 'User not found' },
		{ status: 404 }
	  )
	}

	await base('users').update([
	  {
		id: userRec.id,
		fields: {
		  zoomAccessToken: access_token,
		  zoomRefreshToken: refresh_token,
		  zoomTokenExpires: expiresAt,
		},
	  },
	])

	// 6) Clean up and redirect back
	const res = NextResponse.redirect(
	  new URL('/dashboard?zoom=connected', request.url)
	)
	res.cookies.delete('zoom_oauth_state', { path: '/' })
	return res

  } catch (err: any) {
	console.error('[Zoom Callback] Error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
