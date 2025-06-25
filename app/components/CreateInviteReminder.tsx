// File: app/components/CreateInviteReminder.tsx

'use client'

import React, { useState, useEffect } from 'react'
import UserTimeZone from './UserTimeZone'
import { toUtcIso, formatInTZ } from '@/utils/dateUtils'

interface EventOption {
  id: string
  eventId: string
  name: string
  description?: string
  eventDate: string
  eventTimeZone?: string
}

export default function CreateInviteReminder() {
  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null)

  const [days, setDays] = useState<number>(0)
  const [hours, setHours] = useState<number>(0)
  const [mins, setMins] = useState<number>(0)

  // User’s preferred time zone
  const [timeZone, setTimeZone] = useState<string>(
	Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [reminderTime, setReminderTime] = useState<string>('')
  const [messageBody, setMessageBody] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load user's preferred time zone from API (overrides default if set)
  useEffect(() => {
	async function fetchTZ() {
	  try {
		const res = await fetch('/api/users/timezone')
		const body = await res.json()
		setTimeZone(
		  body.timeZone ||
		  Intl.DateTimeFormat().resolvedOptions().timeZone
		)
	  } catch {
		setTimeZone(
		  Intl.DateTimeFormat().resolvedOptions().timeZone
		)
	  }
	}
	fetchTZ()
  }, [])

  // Load user's events for dropdown
  useEffect(() => {
	async function loadEvents() {
	  try {
		const res = await fetch('/api/events')
		const body = await res.json()
		if (!res.ok) throw new Error(body.error || `API ${res.status}`)
		const data = body.data as any[]
		setEvents(
		  data.map((e) => ({
			id: e.id,
			eventId: e.eventId,
			name: e.name,
			description: e.description,
			eventDate: e.eventDate,
			eventTimeZone: e.eventTimeZone,
		  }))
		)
	  } catch (err: any) {
		setError(err.message)
	  }
	}
	loadEvents()
  }, [])

  // When they select an event, pull its full details
  useEffect(() => {
	const ev =
	  events.find((e) => e.eventId === selectedEventId) || null
	setSelectedEvent(ev)
  }, [selectedEventId, events])

  // Compute the actual reminder datetime whenever event, offsets, or timeZone change
  useEffect(() => {
	if (!selectedEvent) {
	  setReminderTime('')
	  return
	}

	// Parse the event's UTC timestamp, subtract offset, and re-ISO it
	const eventUtcMs = new Date(selectedEvent.eventDate).getTime()
	const offsetMs =
	  ((days * 24 + hours) * 60 + mins) * 60 * 1000
	const sendAt = new Date(eventUtcMs - offsetMs)
	setReminderTime(sendAt.toISOString())
  }, [selectedEvent, days, hours, mins])

  // Handle form submit
  async function handleSubmit(e: React.FormEvent) {
	e.preventDefault()
	setError(null)
	setSuccess(null)
	if (!selectedEvent) {
	  setError('Please select an event.')
	  return
	}
	if (!messageBody.trim()) {
	  setError('Please enter a message body.')
	  return
	}
	setLoading(true)
	try {
	  const res = await fetch('/api/invites/reminder', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
		  eventId: selectedEvent.eventId,
		  days,
		  hours,
		  mins,
		  messageBody,
		}),
	  })
	  const body = await res.json()
	  if (!res.ok)
		throw new Error(body.error || `API ${res.status}`)
	  setSuccess(
		`Created ${body.created} invites. They will send at ${formatInTZ(
		  toUtcIso(body.reminderTime),
		  timeZone
		)}.`
	  )
	} catch (err: any) {
	  setError(err.message)
	} finally {
	  setLoading(false)
	}
  }

  return (
	<>
	  <UserTimeZone />

	  <form
		onSubmit={handleSubmit}
		className="space-y-6 p-4 border rounded bg-white"
	  >
		{error && <p className="text-red-600">{error}</p>}
		{success && <p className="text-green-600">{success}</p>}

		<div>
		  <label
			htmlFor="event"
			className="block font-medium"
		  >
			Select Event{' '}
			<span className="text-sm text-gray-500">
			  ({timeZone})
			</span>
		  </label>
		  <select
			id="event"
			value={selectedEventId}
			onChange={(e) =>
			  setSelectedEventId(e.target.value)
			}
			className="mt-1 block w-full border p-2 rounded"
		  >
			<option value="">
			  -- choose an event --
			</option>
			{events.map((ev) => {
			  const zone =
				ev.eventTimeZone || timeZone
			  const label = `${ev.name} — ${formatInTZ(
				ev.eventDate,
				zone
			  )} (${zone})`
			  return (
				<option
				  key={ev.eventId}
				  value={ev.eventId}
				>
				  {label}
				</option>
			  )
			})}
		  </select>
		</div>

		{selectedEvent && (
		  <div className="p-4 border rounded bg-gray-50">
			<h3 className="font-semibold">
			  {selectedEvent.name}
			</h3>
			{selectedEvent.description && (
			  <p className="text-sm">
				{selectedEvent.description}
			  </p>
			)}
			<p className="text-sm">
			  When:{' '}
			  {formatInTZ(
				selectedEvent.eventDate,
				selectedEvent.eventTimeZone || timeZone
			  )}{' '}
			  <span className="text-gray-500">
				(
				{selectedEvent.eventTimeZone ||
				  timeZone}
				)
			  </span>
			</p>
		  </div>
		)}

		<div className="grid grid-cols-3 gap-4">
		  <div>
			<label
			  htmlFor="days"
			  className="block font-medium"
			>
			  Days before
			</label>
			<select
			  id="days"
			  value={days}
			  onChange={(e) =>
				setDays(+e.target.value)
			  }
			  className="mt-1 block w-full border p-2 rounded"
			>
			  {Array.from({ length: 31 }, (_, i) => (
				<option key={i} value={i}>
				  {i}
				</option>
			  ))}
			</select>
		  </div>
		  <div>
			<label
			  htmlFor="hours"
			  className="block font-medium"
			>
			  Hours before
			</label>
			<select
			  id="hours"
			  value={hours}
			  onChange={(e) =>
				setHours(+e.target.value)
			  }
			  className="mt-1 block w-full border p-2 rounded"
			>
			  {Array.from({ length: 24 }, (_, i) => (
				<option key={i} value={i}>
				  {i}
				</option>
			  ))}
			</select>
		  </div>
		  <div>
			<label
			  htmlFor="mins"
			  className="block font-medium"
			>
			  Minutes before
			</label>
			<select
			  id="mins"
			  value={mins}
			  onChange={(e) =>
				setMins(+e.target.value)
			  }
			  className="mt-1 block w-full border p-2 rounded"
			>
			  {Array.from({ length: 60 }, (_, i) => (
				<option key={i} value={i}>
				  {i}
				</option>
			  ))}
			</select>
		  </div>
		</div>

		{reminderTime && (
		  <p className="text-sm text-gray-600">
			Reminder will go out at:{' '}
			{formatInTZ(reminderTime, timeZone)}
		  </p>
		)}

		<div>
		  <label
			htmlFor="messageBody"
			className="block font-medium"
		  >
			Message Body
		  </label>
		  <textarea
			id="messageBody"
			required
			rows={4}
			value={messageBody}
			onChange={(e) =>
			  setMessageBody(e.target.value)
			}
			className="mt-1 block w-full border p-2 rounded"
		  />
		</div>

		<button
		  type="submit"
		  disabled={loading}
		  className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
		>
		  {loading ? 'Creating…' : 'Create Invites'}
		</button>
	  </form>
	</>
  )
}
