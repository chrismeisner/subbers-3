// File: app/dashboard/create-invite-reminder/page.tsx

'use client'

import React from 'react'
import CreateInviteReminder from '../../components/CreateInviteReminder'

export default function CreateInviteReminderPage() {
  return (
	<main className="p-6 max-w-3xl mx-auto">
	  <h1 className="text-2xl font-bold mb-4">Create Invite Reminder</h1>
	  <CreateInviteReminder />
	</main>
  )
}
