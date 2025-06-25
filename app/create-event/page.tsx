// File: app/create-event/page.tsx

'use client'

import React from 'react'
import CreateEvent from '../components/CreateEvent'

export default function CreateEventPage() {
  return (
	<main className="p-6 max-w-3xl mx-auto">
	  <h1 className="text-2xl font-bold mb-4">Create New Event</h1>
	  <CreateEvent />
	</main>
  )
}
