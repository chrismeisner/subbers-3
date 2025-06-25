// File: app/api/zoom/connect/route.ts

import { NextResponse, NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  // 1) Generate a secure CSRF state token
  const state = randomUUID()

  // 2) Read Zoom OAuth credentials from environment
  const clientId = process.env.ZOOM_CLIENT_ID!
  const redirectUri = process.env.ZOOM_REDIRECT_URI!

  // 3) Build Zoom OAuth authorization URL
  const params = new URLSearchParams({
	response_type: 'code',
	client_id: clientId,
	redirect_uri: redirectUri,
	state,
  })
  const zoomAuthorizeUrl = `https://zoom.us/oauth/authorize?${params.toString()}`

  // 4) Set state in an HttpOnly cookie and redirect to Zoom
  const res = NextResponse.redirect(zoomAuthorizeUrl)
  res.cookies.set('zoom_oauth_state', state, {
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax',
	path: '/',
	maxAge: 300, // valid for 5 minutes
  })

  return res
}
