// File: lib/sync.ts

import Airtable from 'airtable'
import { getStripeClient } from '@/lib/getStripeClient'
import { RRule } from 'rrule'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
  .base(process.env.AIRTABLE_BASE_ID!)

/**
 * For the given user's email, finds all Events they own,
 * fetches all Stripe Subscriptions for each Event's productId,
 * and for one-off events, fetches paid Checkout Sessions for each paymentLinkId,
 * retrieves customer details, upserts those into the Subscribers table,
 * and updates a `nextEvent` field on each event based on its recurrenceInterval.
 */
export async function runSuperSync(userEmail: string) {
  console.log(`[SuperSync] Starting super sync for user ${userEmail}`)

  // 1) Fetch events owned by this user
  console.log(
	`[SuperSync] Querying "events" table for {emailLookup} = "${userEmail}"`
  )
  const events = await base('events')
	.select({ filterByFormula: `{emailLookup} = "${userEmail}"` })
	.firstPage()
  console.log(
	`[SuperSync] Found ${events.length} event(s) for user ${userEmail}`
  )

  // 2) Initialize Stripe client
  const stripe = await getStripeClient()

  // 3) Iterate each event and sync subscribers
  for (const ev of events) {
	const eventRecordId = ev.id
	const fields = ev.fields as any
	const productId = fields.productId as string | undefined
	const paymentLinkId = fields.paymentLinkId as string | undefined
	const recurrenceInterval = fields.recurrenceInterval as string | undefined
	const eventDate = fields.eventDate as string | undefined

	// 3a) Compute and update nextEvent if recurring
	if (recurrenceInterval && eventDate) {
	  try {
		const rule = RRule.fromString(recurrenceInterval)
		// find next occurrence strictly after now
		const next = rule.after(new Date(), false)
		if (next) {
		  console.log(
			`[SuperSync] Updating event ${eventRecordId} nextEvent → ${next.toISOString()}`
		  )
		  await base('events').update([
			{ id: eventRecordId, fields: { nextEvent: next.toISOString() } },
		  ])
		}
	  } catch (err: any) {
		console.warn(
		  `[SuperSync] Could not compute nextEvent for ${eventRecordId}: ${err.message}`
		)
	  }
	}

	// 3b) Skip if no productId and no paymentLinkId
	if (!productId && !paymentLinkId) {
	  console.log(
		`[SuperSync] Skipping Event ${eventRecordId}: neither productId nor paymentLinkId present`
	  )
	  continue
	}

	// 3c) Handle one-off events via Checkout Sessions
	if (!recurrenceInterval && paymentLinkId) {
	  console.log(
		`[SuperSync] Syncing one-off sessions for paymentLink ${paymentLinkId}`
	  )
	  let cursor: string | undefined
	  do {
		const resp = await stripe.checkout.sessions.list({
		  payment_link: paymentLinkId,
		  limit: 100,
		  ...(cursor && { starting_after: cursor }),
		})
		const paidSessions = resp.data.filter(
		  (s) => s.payment_status === 'paid'
		)

		for (const session of paidSessions) {
		  const sessionId = session.id
		  const customerDetails = session.customer_details
		  const email = customerDetails?.email
		  if (!email) {
			console.log(
			  `[SuperSync] Skipping session ${sessionId}: no customer email`
			)
			continue
		  }

		  const recordFields: Record<string, any> = {
			subscriptionId: sessionId,
			planName: '',
			productName: '',
			name: customerDetails.name ?? '',
			email,
			phone: customerDetails.phone ?? '',
			status: 'one_off',
			createdDate: new Date(session.created * 1000).toISOString(),
			currentPeriodEndDate: '',
			eventLink: [eventRecordId],
		  }

		  console.log(
			`[SuperSync] Upserting one-off subscriber ${sessionId}`
		  )
		  const [existing] = await base('subscribers')
			.select({
			  filterByFormula: `{subscriptionId} = "${sessionId}"`,
			  maxRecords: 1,
			})
			.firstPage()

		  if (existing) {
			await base('subscribers').update([
			  { id: existing.id, fields: recordFields },
			])
			console.log(
			  `[SuperSync] Updated one-off subscriber ${sessionId}`
			)
		  } else {
			await base('subscribers').create([{ fields: recordFields }])
			console.log(
			  `[SuperSync] Created one-off subscriber ${sessionId}`
			)
		  }
		}

		cursor = resp.has_more
		  ? resp.data[resp.data.length - 1].id
		  : undefined
	  } while (cursor)

	  // Done with one-off; skip the recurring-subscriptions logic
	  continue
	}

	// 3d) Handle recurring subscriptions
	console.log(
	  `[SuperSync] Fetching subscriptions for product ${productId}`
	)
	let startingAfter: string | undefined = undefined
	let page = 1
	do {
	  const list = await stripe.subscriptions.list({
		limit: 100,
		...(startingAfter && { starting_after: startingAfter }),
	  })
	  console.log(
		`[SuperSync] Page ${page}: fetched ${list.data.length} subscriptions`
	  )

	  // 4) Filter subscriptions by productId
	  const matches = list.data.filter((sub) => {
		const raw = sub.items.data[0].price.product
		const pid = typeof raw === 'string' ? raw : raw.id
		return pid === productId
	  })
	  console.log(
		`[SuperSync] Found ${matches.length} matching subscriptions on page ${page}`
	  )

	  // 5) Upsert each matching subscription
	  for (const sub of matches) {
		const subscriptionId = sub.id
		const customerRef = sub.customer as string | undefined
		if (!customerRef) {
		  console.log(
			`[SuperSync] Skipping subscription ${subscriptionId}: no customer ID`
		  )
		  continue
		}

		// retrieve full customer details
		let customer
		try {
		  customer = await stripe.customers.retrieve(customerRef)
		} catch (err: any) {
		  console.log(
			`[SuperSync] Error retrieving customer ${customerRef}: ${err.message}`
		  )
		  continue
		}

		const email = (customer as any).email
		if (!email) {
		  console.log(
			`[SuperSync] Skipping subscription ${subscriptionId}: customer has no email`
		  )
		  continue
		}
		const phone = (customer as any).phone || ''
		const name = (customer as any).name || ''

		const recordFields = {
		  subscriptionId,
		  planName: sub.items.data[0].price.nickname ?? '',
		  productName:
			typeof sub.items.data[0].price.product === 'string'
			  ? ''
			  : sub.items.data[0].price.product.name,
		  name,
		  email,
		  phone,
		  status: sub.status === 'active' ? 'Active' : sub.status,
		  createdDate: new Date(sub.created * 1000).toISOString(),
		  currentPeriodEndDate: new Date(
			sub.current_period_end * 1000
		  ).toISOString(),
		  eventLink: [eventRecordId],
		}

		console.log(`[SuperSync] Upserting subscription ${subscriptionId}`)
		const existing = await base('subscribers')
		  .select({
			filterByFormula: `{subscriptionId} = "${subscriptionId}"`,
			maxRecords: 1,
		  })
		  .firstPage()

		if (existing.length) {
		  await base('subscribers').update([
			{ id: existing[0].id, fields: recordFields },
		  ])
		  console.log(`[SuperSync] Updated subscriber ${subscriptionId}`)
		} else {
		  await base('subscribers').create([{ fields: recordFields }])
		  console.log(`[SuperSync] Created subscriber ${subscriptionId}`)
		}
	  }

	  // prepare next page
	  startingAfter = list.has_more
		? list.data[list.data.length - 1].id
		: undefined
	  page++
	} while (startingAfter)
  }

  console.log(`[SuperSync] Completed super sync for user ${userEmail}`)
}
