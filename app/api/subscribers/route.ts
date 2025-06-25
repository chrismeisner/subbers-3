// File: app/api/subscribers/route.ts

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import base from '../../../lib/airtable'

export async function POST(request: Request) {
  try {
	const { subscribers } = await request.json()
	if (!Array.isArray(subscribers)) {
	  return NextResponse.json(
		{ error: 'Invalid payload: expected { subscribers: [...] }' },
		{ status: 400 }
	  )
	}

	// Look up the current user’s Airtable record ID via the HttpOnly cookie
	const cookieStore = await cookies()
	const userEmail = cookieStore.get('userEmail')?.value
	if (!userEmail) {
	  throw new Error('Not authenticated')
	}
	const userRecords = await base('users')
	  .select({
		filterByFormula: `{email} = "${userEmail}"`,
		maxRecords: 1,
	  })
	  .firstPage()
	if (userRecords.length === 0) {
	  throw new Error('User record not found')
	}
	const ownerId = userRecords[0].id

	const chunkSize = 10
	let createdCount = 0
	let updatedCount = 0

	for (let i = 0; i < subscribers.length; i += chunkSize) {
	  const chunk = subscribers.slice(i, i + chunkSize)

	  // 1) Query existing Airtable records by subscriptionId
	  const escapedIds = chunk.map(s => s.subscriptionId.replace(/"/g, '\\"'))
	  const formula =
		escapedIds.length === 1
		  ? `{subscriptionId} = "${escapedIds[0]}"`
		  : `OR(${escapedIds.map(id => `{subscriptionId} = "${id}"`).join(',')})`

	  const existing = await base('subscribers')
		.select({
		  filterByFormula: formula,
		  fields: ['subscriptionId'],
		  maxRecords: chunkSize,
		})
		.firstPage()

	  const idToRecordId: Record<string, string> = {}
	  existing.forEach(rec => {
		const subId = rec.get('subscriptionId') as string
		if (subId) idToRecordId[subId] = rec.id
	  })

	  // 2) Split into updates vs creates
	  const toUpdate: { id: string; fields: Record<string, any> }[] = []
	  const toCreate: { fields: Record<string, any> }[] = []

	  chunk.forEach(sub => {
		const fields: Record<string, any> = {
		  subscriptionId: sub.subscriptionId,
		  planName: sub.planName,
		  productName: sub.productName,
		  name: sub.name,
		  email: sub.email,
		  phone: sub.phone,
		  status: sub.status,
		  createdDate: sub.createdDate,
		  currentPeriodEndDate: sub.currentPeriodEndDate,
		  ownerId: [ownerId],    // link back to the current user
		}

		const recordId = idToRecordId[sub.subscriptionId]
		if (recordId) {
		  toUpdate.push({ id: recordId, fields })
		} else {
		  toCreate.push({ fields })
		}
	  })

	  // ▶️ log exactly what we’ll send to Airtable
	  console.log(`[sync] chunk ${i / chunkSize + 1} will update:`, toUpdate)
	  console.log(`[sync] chunk ${i / chunkSize + 1} will create:`, toCreate)

	  // 3) Perform batch updates and creates
	  if (toUpdate.length) {
		const updated = await base('subscribers').update(toUpdate)
		updatedCount += updated.length
	  }
	  if (toCreate.length) {
		const created = await base('subscribers').create(toCreate)
		createdCount += created.length
	  }

	  console.log(
		`[sync] chunk ${i / chunkSize + 1}: created=${createdCount} updated=${updatedCount}`
	  )
	}

	console.log(
	  `[sync] COMPLETE: total created=${createdCount} total updated=${updatedCount}`
	)

	return NextResponse.json({ created: createdCount, updated: updatedCount })
  } catch (err: any) {
	console.error('Airtable upsert error:', err)
	return NextResponse.json(
	  { error: err.message || 'Internal Server Error' },
	  { status: 500 }
	)
  }
}
