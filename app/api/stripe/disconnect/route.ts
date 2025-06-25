// File: app/api/stripe/disconnect/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '@/lib/airtable'

export async function POST() {
  // 1) Read userEmail from our HttpOnly cookie
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('userEmail')?.value
  if (!userEmail) {
	return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 2) Look up the Airtable user record
  const userRecs = await base('users')
	.select({
	  filterByFormula: `{email} = "${userEmail}"`,
	  maxRecords: 1,
	})
	.firstPage()

  if (userRecs.length === 0) {
	return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const userId = userRecs[0].id

  // 3) Clear the stripeSecretKey field
  try {
	await base('users').update([
	  { id: userId, fields: { stripeSecretKey: '' } },
	])
	return NextResponse.json({ ok: true })
  } catch (err: any) {
	return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
