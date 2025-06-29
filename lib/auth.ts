// File: lib/auth.ts

import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  // Configure authentication providers
  providers: [
	GoogleProvider({
	  clientId: process.env.GOOGLE_CLIENT_ID!,
	  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
	}),
  ],

  // Use JWT-based sessions
  session: {
	strategy: "jwt",
  },
}

export default NextAuth(authOptions)
