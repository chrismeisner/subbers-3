// File: app/api/users/timezone/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '@/lib/airtable'

export async function GET(request: Request) {
  try {
	// 1) Read userEmail from HttpOnly cookie
	const cookieStore = await cookies()
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  return NextResponse.json({ timeZone: null }, { status: 200 })
	}

	// 2) Lookup the user record
	const records = await base('users')
	  .select({
		filterByFormula: `{email} = "${userEmail}"`,
		maxRecords: 1,
	  })
	  .firstPage()
	if (records.length === 0) {
	  return NextResponse.json({ timeZone: null }, { status: 200 })
	}

	// 3) Return their timeZone (or null if not set)
	const tz = (records[0].fields as any).timeZone as string | undefined
	return NextResponse.json({ timeZone: tz ?? null }, { status: 200 })
  } catch (err: any) {
	console.error('[TimeZone GET] Error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}

export async function PATCH(request: Request) {
  try {
	// 1) Parse and validate payload
	const { timeZone } = await request.json()
	if (!timeZone || typeof timeZone !== 'string') {
	  return NextResponse.json(
		{ error: 'Invalid payload: expected { timeZone: string }' },
		{ status: 400 }
	  )
	}

	// 2) Authenticate user
	const cookieStore = await cookies()
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
	}

	// 3) Lookup the user record
	const records = await base('users')
	  .select({
		filterByFormula: `{email} = "${userEmail}"`,
		maxRecords: 1,
	  })
	  .firstPage()
	if (records.length === 0) {
	  return NextResponse.json({ error: 'User not found' }, { status: 404 })
	}
	const userId = records[0].id

	// 4) Update their timeZone field
	const [updated] = await base('users').update([
	  { id: userId, fields: { timeZone } },
	])

	// 5) Return success
	return NextResponse.json(
	  { ok: true, timeZone: (updated.fields as any).timeZone },
	  { status: 200 }
	)
  } catch (err: any) {
	console.error('[TimeZone PATCH] Error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
