// File: app/api/logout/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

export async function POST() {
  // Build a response that clears the HttpOnly userEmail cookie
  const res = NextResponse.json({ ok: true })
  res.cookies.set('userEmail', '', {
	httpOnly: true,
	path: '/',
	maxAge: 0, // Expire immediately
	sameSite: 'lax',
	secure: process.env.NODE_ENV === 'production',
  })
  return res
}
