// File: middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect anything under /dashboard
  if (pathname.startsWith('/dashboard')) {
	const userEmail = req.cookies.get('userEmail')
	if (!userEmail) {
	  // Not logged in → redirect to login
	  const loginUrl = req.nextUrl.clone()
	  loginUrl.pathname = '/login'
	  return NextResponse.redirect(loginUrl)
	}
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
