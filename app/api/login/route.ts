// File: app/api/login/route.ts

import { NextResponse } from 'next/server'
import base from '../../../lib/airtable'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.trim()

  if (!email) {
	return NextResponse.json(
	  { error: 'Missing email parameter' },
	  { status: 400 }
	)
  }

  try {
	// Look up the user by email in the “users” table
	const records = await base('users')
	  .select({
		filterByFormula: `{email} = "${email}"`,
		maxRecords: 1,
	  })
	  .firstPage()

	if (records.length === 0) {
	  return NextResponse.json(
		{ error: 'User not found' },
		{ status: 404 }
	  )
	}

	const record = records[0]
	const now = new Date().toISOString()

	// Update the "lastLogin" field
	await base('users').update([
	  { id: record.id, fields: { lastLogin: now } }
	])

	// Build the user object to return
	const user = {
	  id: record.id,
	  fields: { ...record.fields, lastLogin: now },
	}

	console.log(`Logged in user: ${email} at ${now}`)

	// Return JSON response and set an HttpOnly cookie for userEmail
	const res = NextResponse.json({ user })
	res.cookies.set('userEmail', email, {
	  httpOnly: true,
	  path: '/',
	  sameSite: 'lax',
	  secure: process.env.NODE_ENV === 'production',
	  maxAge: 60 * 60 * 24 * 30, // 30 days
	})
	return res

  } catch (err: any) {
	console.error('Airtable login error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
