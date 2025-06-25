// File: app/api/signup/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import base from '../../../lib/airtable'

export async function POST(request: Request) {
  try {
	const { name, email } = await request.json()

	// Validate inputs
	if (
	  !name ||
	  !email ||
	  typeof name !== 'string' ||
	  typeof email !== 'string'
	) {
	  return NextResponse.json(
		{ error: 'Missing or invalid name or email' },
		{ status: 400 }
	  )
	}

	// Look for existing user by email
	const existing = await base('users')
	  .select({
		filterByFormula: `{email} = "${email}"`,
		maxRecords: 1,
	  })
	  .firstPage()

	let userRecord
	if (existing.length > 0) {
	  // If user exists, optionally update their name
	  userRecord = existing[0]
	  const currentName = userRecord.get('name')
	  if (currentName !== name) {
		const updated = await base('users').update([
		  { id: userRecord.id, fields: { name } },
		])
		userRecord = updated[0]
	  }
	} else {
	  // Create new user record
	  const created = await base('users').create([
		{ fields: { name, email } },
	  ])
	  userRecord = created[0]
	}

	// Set HttpOnly cookie and return user fields
	const response = NextResponse.json({ user: userRecord.fields })
	response.cookies.set('userEmail', email, {
	  httpOnly: true,
	  path: '/',
	  sameSite: 'lax',
	  secure: process.env.NODE_ENV === 'production',
	  maxAge: 60 * 60 * 24 * 30, // 30 days
	})
	return response
  } catch (err: any) {
	console.error('Signup error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
