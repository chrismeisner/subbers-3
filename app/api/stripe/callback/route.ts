// File: app/api/stripe/callback/route.ts

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'
import base from '@/lib/airtable'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const returnedState = searchParams.get('state')
  const code = searchParams.get('code')

  // 1) Verify CSRF state from HttpOnly cookie
  const cookieStore = await cookies()
  const storedState = cookieStore.get('stripe_oauth_state')?.value
  if (!returnedState || returnedState !== storedState) {
    console.error('[Stripe Callback] CSRF mismatch')
    return NextResponse.json(
      { error: 'Invalid or missing CSRF state' },
      { status: 400 }
    )
  }

  // 2) Ensure we got an authorization code
  if (!code) {
    return NextResponse.json(
      { error: 'Missing authorization code' },
      { status: 400 }
    )
  }

  try {
    // 3) Exchange code for an access token
    const tokenRes = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    })
    const connectedSecret = tokenRes.access_token
    if (!connectedSecret) {
      throw new Error('No access token returned from Stripe')
    }
    const stripeAccountId = tokenRes.stripe_user_id
    if (!stripeAccountId) {
      throw new Error('No Stripe account ID returned from Stripe')
    }

    // 4) Identify the logged-in user via our HttpOnly cookie
    const userCookieStore = await cookies()
    const userEmail = userCookieStore.get('userEmail')?.value
    if (!userEmail) {
      throw new Error('Not authenticated')
    }

    // 5) Retrieve the connected Stripe account to get its email
    const connectedStripe = new Stripe(connectedSecret, {
      apiVersion: '2022-11-15',
    })
    const account = await connectedStripe.accounts.retrieve()
    const stripeLoginEmail = account.email ?? null

    // 6) Persist the Stripe account ID, secret key, and the Stripe account's email in the user's Airtable record
    const userRecords = await base('users')
      .select({
        filterByFormula: `{email} = "${userEmail}"`,
        maxRecords: 1,
      })
      .firstPage()

    if (userRecords.length === 0) {
      throw new Error('User not found')
    }

    await base('users').update([
      {
        id: userRecords[0].id,
        fields: {
          stripeAccountId: stripeAccountId,
          stripeSecretKey: connectedSecret,
          stripeEmail: stripeLoginEmail,
        },
      },
    ])

    // 7) Clear the CSRF cookie and redirect back to the dashboard
    const response = NextResponse.redirect(
      new URL('/dashboard?connected=success', request.url)
    )
    response.cookies.delete('stripe_oauth_state', { path: '/' })
    return response
  } catch (err: any) {
    console.error('[Stripe Callback] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
