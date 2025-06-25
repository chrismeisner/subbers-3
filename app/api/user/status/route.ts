// File: app/api/user/status/route.ts

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getUserRecord } from "@/lib/airtable"
import { stripe } from "@/lib/stripe"

export async function GET(req: Request) {
  // 1️⃣ Get the NextAuth session
  const session = (await getServerSession(authOptions)) as any
  if (!session) {
	console.log("[UserStatus] no session, returning unauthenticated status")
	return NextResponse.json({
	  stripeConnected: false,
	  stripeAccountId: null,
	  stripeAccountBalance: null,
	})
  }

  // 2️⃣ Look up the user record in Airtable
  const uid = session.user.id
  console.log(`[UserStatus] fetched session, uid=${uid}`)
  const userRec = await getUserRecord(uid)
  if (!userRec) {
	console.log(`[UserStatus] no Airtable record for uid=${uid}`)
	return NextResponse.json({
	  stripeConnected: false,
	  stripeAccountId: null,
	  stripeAccountBalance: null,
	})
  }

  // 3️⃣ Stripe connection and balance
  const rawStripe = userRec.fields.stripeAccountId
  const stripeConnected = Boolean(rawStripe)
  let stripeAccountBalance: { amount: number; currency: string } | null = null

  if (stripeConnected && typeof rawStripe === "string") {
	console.log(`[UserStatus] stripeConnected → accountId=${rawStripe}`)
	try {
	  const balance = await stripe.balance.retrieve(
		{},
		{ stripeAccount: rawStripe }
	  )
	  if (balance.available.length > 0) {
		const { amount, currency } = balance.available[0]
		stripeAccountBalance = { amount, currency }
		console.log(`[UserStatus] stripeAccountBalance=${amount} ${currency}`)
	  } else {
		console.log("[UserStatus] no available balance entries")
	  }
	} catch (err) {
	  console.error("[UserStatus] failed to fetch Stripe balance:", err)
	}
  } else {
	console.log("[UserStatus] stripe not connected or invalid accountId")
  }

  // 4️⃣ Respond with aggregated status
  return NextResponse.json({
	stripeConnected,
	stripeAccountId:
	  stripeConnected && typeof rawStripe === "string" ? rawStripe : null,
	stripeAccountBalance,
  })
}
