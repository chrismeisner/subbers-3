// File: app/api/stripe/status/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '@/lib/airtable'
import Stripe from 'stripe'

export async function GET() {
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('userEmail')?.value
  if (!userEmail) {
	return NextResponse.json({ connected: false }, { status: 200 })
  }

  // Lookup user in Airtable
  const userRecs = await base('users')
	.select({ filterByFormula: `{email} = "${userEmail}"`, maxRecords: 1 })
	.firstPage()
  if (userRecs.length === 0) {
	return NextResponse.json({ connected: false }, { status: 200 })
  }

  const { stripeSecretKey, stripeAccountId, stripeEmail } =
	userRecs[0].fields as any
  if (!stripeSecretKey || !stripeAccountId) {
	return NextResponse.json({ connected: false }, { status: 200 })
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2022-11-15' })

  // 1) Retrieve the full Connect account
  const account = await stripe.accounts.retrieve(stripeAccountId)
  console.log(
	'[Stripe Status] Full account object:',
	JSON.stringify(account, null, 2)
  )

  // 2) Pull out the dashboard display name
  const dashboardName = account.settings?.dashboard?.display_name ?? null

  // 3) Try to create a login link, but don’t let failure wipe out dashboardName
  let loginLink: string | null = null
  try {
	const resp = await stripe.accounts.createLoginLink(stripeAccountId, {
	  redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
	})
	loginLink = resp.url
  } catch (err: any) {
	console.error('[Stripe Status] Error creating login link:', err)
  }

  // 4) Return everything in one go
  return NextResponse.json(
	{
	  connected: true,
	  secretKey: stripeSecretKey.slice(0, 14) + '…',
	  email: stripeEmail ?? null,
	  dashboardName,
	  loginLink,
	},
	{ status: 200 }
  )
}
