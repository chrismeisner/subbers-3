// File: app/components/EventsTable.tsx

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import UserTimeZone from './UserTimeZone'
import { formatInTZ } from '@/utils/dateUtils'

export type EventRecord = {
  eventId?: string
  name: string
  description: string
  eventDate: string
  eventTimeZone?: string
  isRecurring: boolean
  recurrenceInterval: string
  ticketPrice: number
  paymentLinkId?: string
  paymentLinkUrl?: string
}

export default function EventsTable() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [timeZone, setTimeZone] = useState<string>('UTC')

  const CACHE_KEY = 'eventsData'
  const TIME_KEY = 'eventsLastSync'
  const TTL = 3 * 60 * 60 * 1000 // 3 hours

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

  async function fetchEvents() {
	setSyncing(true)
	setError(null)
	try {
	  const res = await fetch('/api/events')
	  const body = await res.json()
	  if (!res.ok) throw new Error(body.error || `API ${res.status}`)
	  const data = body.data as EventRecord[]

	  setEvents(data)
	  const nowIso = new Date().toISOString()
	  setLastSynced(nowIso)
	  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
	  localStorage.setItem(TIME_KEY, nowIso)
	} catch (err: any) {
	  setError(err.message)
	} finally {
	  setLoading(false)
	  setSyncing(false)
	}
  }

  useEffect(() => {
	const cached = localStorage.getItem(CACHE_KEY)
	const time = localStorage.getItem(TIME_KEY)
	if (cached && time) {
	  const age = Date.now() - new Date(time).getTime()
	  if (age < TTL) {
		setEvents(JSON.parse(cached))
		setLastSynced(time)
		setLoading(false)
		return
	  }
	}
	fetchEvents()
  }, [])

  if (loading) return <p>Loading events…</p>
  if (error) return <p className="text-red-600">Error: {error}</p>
  if (!events.length) return (
	<div className="text-center space-y-4">
	  <p>No events found.</p>
	  <button
		onClick={fetchEvents}
		disabled={syncing}
		className={`px-4 py-2 rounded text-white ${
		  syncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600'
		}`}
	  >
		{syncing ? 'Fetching…' : 'Fetch Events'}
	  </button>
	</div>
  )

  return (
	<>
	  <UserTimeZone />

	  <div className="overflow-x-auto">
		<div className="flex items-center justify-between mb-2">
		  {lastSynced && (
			<p className="text-sm text-gray-500">
			  Last synced: {formatInTZ(lastSynced, timeZone)}
			</p>
		  )}
		  <button
			onClick={fetchEvents}
			disabled={syncing}
			className={`px-4 py-2 rounded text-white ${
			  syncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600'
			}`}
		  >
			{syncing ? 'Syncing…' : 'Sync Now'}
		  </button>
		</div>
		<table className="w-full table-auto border-collapse">
		  <thead>
			<tr className="bg-gray-200">
			  <th className="px-3 py-1 text-left">Name</th>
			  <th className="px-3 py-1 text-left">Description</th>
			  <th className="px-3 py-1 text-left">Date</th>
			  <th className="px-3 py-1 text-left">Recurring?</th>
			</tr>
		  </thead>
		  <tbody>
			{events.map((e, i) => (
			  <tr key={i} className="border-t">
				<td className="px-3 py-1">
				  {e.eventId ? (
					<Link
					  href={`/dashboard/events/${e.eventId}`}
					  className="text-blue-600 hover:underline"
					>
					  {e.name}
					</Link>
				  ) : (
					e.name
				  )}
				</td>
				<td className="px-3 py-1">{e.description}</td>
				<td className="px-3 py-1">
				  {formatInTZ(
					e.eventDate,
					e.eventTimeZone || timeZone
				  )}
				</td>
				<td className="px-3 py-1">{e.isRecurring ? 'Yes' : 'No'}</td>
			  </tr>
			))}
		  </tbody>
		</table>
	  </div>
	</>
  )
}
