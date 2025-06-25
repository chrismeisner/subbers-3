// File: lib/getStripeClient.ts

import Stripe from 'stripe'
import base from './airtable'
import { cookies } from 'next/headers'

export async function getStripeClient(): Promise<Stripe> {
  // 1. Grab the logged-in email from an HttpOnly cookie
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('userEmail')?.value
  if (!userEmail) {
	throw new Error('Not authenticated')
  }

  // 2. Lookup that user in Airtable to retrieve their Stripe key
  const records = await base('users')
	.select({
	  filterByFormula: `{email} = "${userEmail}"`,
	  maxRecords: 1,
	})
	.firstPage()

  if (records.length === 0) {
	throw new Error('User record not found')
  }

  const stripeKey = (records[0].fields as any).stripeSecretKey
  if (!stripeKey) {
	throw new Error('No Stripe key on user record')
  }

  // 3. Return a Stripe instance scoped to that user’s key
  return new Stripe(stripeKey, { apiVersion: '2022-11-15' })
}
