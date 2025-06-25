// lib/reminders.ts

import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
  .base(process.env.AIRTABLE_BASE_ID!)

/**
 * Enqueues reminder invites for events due within 25 hours,
 * and schedules far-out ones.
 */
export async function runReminderJob(userEmail: string) {
  console.log(`[ReminderJob] Starting reminder job for user ${userEmail}`)
  const now = new Date()

  // 1) Fetch events with status "New" or "Scheduled" for this user
  console.log(
	`[ReminderJob] Querying "events" for {emailLookup}="${userEmail}" AND inviteStatus in ("New","Scheduled")`
  )
  const records = await base('events')
	.select({
	  filterByFormula: `AND(
		{emailLookup} = "${userEmail}",
		OR(
		  {inviteStatus} = "New",
		  {inviteStatus} = "Scheduled"
		)
	  )`,
	})
	.firstPage()
  console.log(`[ReminderJob] Retrieved ${records.length} event(s)`)

  // 2) Iterate each event
  for (const ev of records) {
	const airtableRecordId = ev.id
	const name = ev.get('name') as string
	const status = ev.get('inviteStatus') as string
	const reminderTimeStr = ev.get('reminderTime') as string
	const eventUniqueId = ev.get('eventId') as string

	console.log(
	  `[ReminderJob] Event ${airtableRecordId} ("${name}") status="${status}", reminderTime="${reminderTimeStr}", eventId="${eventUniqueId}"`
	)

	// Parse reminderTime
	const reminderTime = new Date(reminderTimeStr)
	if (isNaN(reminderTime.getTime())) {
	  console.warn(
		`[ReminderJob] Skipping event ${airtableRecordId}: invalid or missing reminderTime`
	  )
	  continue
	}

	// Compute time difference
	const diffMs = reminderTime.getTime() - now.getTime()
	const diffHrs = diffMs / (1000 * 60 * 60)
	console.log(
	  `[ReminderJob] Time until reminder for event ${airtableRecordId}: ${diffHrs.toFixed(2)} hours`
	)

	// 3) If >25h away:
	if (diffMs > 25 * 60 * 60 * 1000) {
	  if (status === 'New') {
		// mark New events as Scheduled
		console.log(
		  `[ReminderJob] Scheduling event ${airtableRecordId} (inviteStatus → "Scheduled")`
		)
		await base('events').update([
		  { id: airtableRecordId, fields: { inviteStatus: 'Scheduled' } },
		])
		console.log(
		  `[ReminderJob] Event ${airtableRecordId} inviteStatus updated to "Scheduled"`
		)
	  } else {
		// already Scheduled, skip until within 25h
		console.log(
		  `[ReminderJob] Event ${airtableRecordId} already "Scheduled", will retry when within 25h`
		)
	  }
	  continue
	}

	// 4) Else (≤25h) → process invites regardless of status
	console.log(
	  `[ReminderJob] Event ${airtableRecordId} is due within 25h, processing invites`
	)

	// Fetch subscribers matching via lookup field (ARRAYJOIN + FIND)
	console.log(
	  `[ReminderJob] Querying "subscribers" for lookup {eventId} contains "${eventUniqueId}"`
	)
	const subs = await base('subscribers')
	  .select({
		filterByFormula: `FIND("${eventUniqueId}", ARRAYJOIN({eventId}))`,
	  })
	  .firstPage()
	console.log(
	  `[ReminderJob] Found ${subs.length} subscriber(s) for eventId "${eventUniqueId}"`
	)

	// Create an invite record for each subscriber
	for (const sub of subs) {
	  const subRecordId = sub.id
	  const email = sub.get('email') as string
	  console.log(
		`[ReminderJob] Creating invite for subscriber ${subRecordId} <${email}>`
	  )

	  const created = await base('invites').create([
		{
		  fields: {
			email,
			eventLink:      [airtableRecordId],
			subscriberLink: [subRecordId],
			status:         'New',
			sentTime:       reminderTimeStr,
		  },
		},
	  ])
	  console.log(
		`[ReminderJob] Created invite ${created[0].id} for subscriber ${subRecordId}`
	  )
	}

	// 5) Mark this event as "Created" so it won’t be re-processed
	console.log(
	  `[ReminderJob] Updating event ${airtableRecordId} inviteStatus → "Created"`
	)
	await base('events').update([
	  { id: airtableRecordId, fields: { inviteStatus: 'Created' } },
	])
	console.log(
	  `[ReminderJob] Event ${airtableRecordId} inviteStatus updated to "Created"`
	)
  }

  console.log(`[ReminderJob] Completed reminder job for user ${userEmail}`)
}
