// File: app/api/sync/run/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { runSuperSync } from '@/lib/sync'

export async function POST() {
  // 1) Read userEmail from HttpOnly cookie
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('userEmail')?.value
  if (!userEmail) {
	return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
	// 2) Run the super‐sync job for this user
	await runSuperSync(userEmail)
	return NextResponse.json({ ok: true })
  } catch (err: any) {
	console.error('Super sync failed:', err)
	return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
