// File: app/api/airtable/route.ts

import { NextResponse } from 'next/server'
import base from '@/lib/airtable'

export async function GET(req: Request) {
  try {
	// do a no-op fetch of one record just to verify credentials
	await base('YourTableName').select({ maxRecords: 1 }).firstPage()
	console.log('Connected to Airtable')
	return NextResponse.json({ message: 'Connected to Airtable' })
  } catch (err: any) {
	console.error('Airtable connection error:', err)
	return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
