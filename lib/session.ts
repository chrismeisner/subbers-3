// File: lib/session.ts

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"  // or wherever you define your NextAuth options
import type { NextRequest } from "next/server"

export async function getCurrentUser(req?: NextRequest) {
  // This will read the cookies from the incoming request
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return { 
	id: session.user.id,
	email: session.user.email,
	// …any other bits you need
  }
}
