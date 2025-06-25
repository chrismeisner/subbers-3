// File: app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth/next"
import GoogleProvider from "next-auth/providers/google"
import { NextAuthOptions } from "next-auth"
import base from "@/lib/airtable"

export const authOptions: NextAuthOptions = {
  // Use a secret to encrypt your JWT and cookies
  secret: process.env.NEXTAUTH_SECRET,

  // Configure authentication providers
  providers: [
	GoogleProvider({
	  clientId: process.env.GOOGLE_CLIENT_ID!,
	  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
	}),
  ],

  // Customize callbacks to persist user info
  callbacks: {
	/**
	 * Runs on every sign-in (Google).
	 * We upsert a user record by email in Airtable.
	 */
	async signIn({ user }) {
	  if (!user.email) return false

	  // Look for an existing Airtable user by email
	  const [existing] = await base("users")
		.select({
		  filterByFormula: `{email} = "${user.email}"`,
		  maxRecords: 1,
		})
		.firstPage()

	  // Fields to save/update
	  const fields: Record<string, any> = {
		email: user.email,
		name: user.name ?? "",
	  }

	  if (existing?.id) {
		await base("users").update([{ id: existing.id, fields }])
	  } else {
		await base("users").create([{ fields }])
	  }

	  return true
	},

	/**
	 * Persist data into the JWT
	 */
	async jwt({ token }) {
	  return token
	},

	/**
	 * Expose necessary fields on the client session object
	 */
	async session({ session }) {
	  return session
	},
  },

  // Use JWT-based sessions
  session: {
	strategy: "jwt",
  },
}

// Create the NextAuth handler
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }