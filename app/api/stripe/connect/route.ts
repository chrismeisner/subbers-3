// File: app/api/stripe/connect/route.ts

import { NextResponse, NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  // 1) Generate a cryptographically secure CSRF state token
  const state = randomUUID()

  // 2) Build Stripe OAuth URL
  const clientId = process.env.STRIPE_CLIENT_ID!
  const redirectUri = process.env.STRIPE_REDIRECT_URI!
  const params = new URLSearchParams({
	response_type: 'code',
	client_id: clientId,
	scope: 'read_write',
	redirect_uri: redirectUri,
	state,
  })
  const stripeAuthorizeUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`

  // 3) Set state in an HttpOnly cookie and redirect to Stripe
  const res = NextResponse.redirect(stripeAuthorizeUrl)
  res.cookies.set('stripe_oauth_state', state, {
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax',
	path: '/',
	maxAge: 300, // valid for 5 minutes
  })

  return res
}
