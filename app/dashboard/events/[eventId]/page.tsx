// File: app/dashboard/events/[eventId]/page.tsx

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import UserTimeZone from '../../../components/UserTimeZone'
import SubscriberTable, { Subscriber } from '../../../components/SubscriberTable'

interface EventDetail {
  eventId: string
  name: string
  description: string
  eventDate: string
  isRecurring: boolean
  recurrenceInterval: string
  ticketPrice: number
  paymentLinkId?: string
  paymentLinkUrl?: string
  priceId?: string
  productId?: string
  eventTimeZone?: string
}

export default function EventDetailPage() {
  const { eventId } = useParams() as { eventId: string }
  const router = useRouter()

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [eventError, setEventError] = useState<string | null>(null)

  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loadingSubs, setLoadingSubs] = useState(true)

  // Load event details
  useEffect(() => {
	async function loadEvent() {
	  try {
		console.log(`[EventDetailPage] fetching event ${eventId}`)
		const res = await fetch(`/api/events/${eventId}`)
		const body = await res.json()
		console.log('[EventDetailPage] event API response', body)
		if (!res.ok) throw new Error(body.error || `API ${res.status}`)
		setEvent(body.data)
	  } catch (err: any) {
		console.error('[EventDetailPage] failed to load event:', err)
		setEventError(err.message)
	  } finally {
		setLoadingEvent(false)
	  }
	}
	loadEvent()
  }, [eventId])

  // Load subscribers for this event
  useEffect(() => {
	async function loadSubscribers() {
	  try {
		console.log(`[EventDetailPage] fetching subscribers for eventId: ${eventId}`)
		const res = await fetch(`/api/events/${eventId}/subscribers`)
		const body = await res.json()
		console.log('[EventDetailPage] subscribers API response', body)
		if (!res.ok) throw new Error(body.error || `API ${res.status}`)
		const subs = body.data as Subscriber[]
		console.log('[EventDetailPage] fetched subscribers array:', subs)
		setSubscribers(subs)
	  } catch (err: any) {
		console.error('[EventDetailPage] failed to load subscribers:', err)
	  } finally {
		setLoadingSubs(false)
	  }
	}
	loadSubscribers()
  }, [eventId])

  if (loadingEvent) return <p>Loading…</p>
  if (eventError) return <p className="text-red-600">Error: {eventError}</p>
  if (!event) return <p className="text-red-600">Event not found</p>

  return (
	<main className="p-6 max-w-3xl mx-auto space-y-6">
	  <UserTimeZone />

	  <div className="flex items-center space-x-4 mb-4">
		<button
		  type="button"
		  onClick={() => router.back()}
		  className="text-sm text-blue-600 underline"
		>
		  ← Back
		</button>
		<Link
		  href={`/dashboard/events/${eventId}/edit`}
		  className="text-sm text-green-600 underline"
		>
		  Edit Event Time
		</Link>
	  </div>

	  <h1 className="text-3xl font-bold">{event.name}</h1>
	  <p className="text-gray-700">{event.description}</p>

	  <div className="space-y-1">
		<p>
		  <strong>Date:</strong>{' '}
		  {new Date(event.eventDate).toLocaleString(undefined, {
			timeZone:
			  event.eventTimeZone ||
			  Intl.DateTimeFormat().resolvedOptions().timeZone,
		  })}
		</p>
		<p>
		  <strong>Recurring:</strong> {event.isRecurring ? 'Yes' : 'No'}
		</p>
		{event.isRecurring && (
		  <p>
			<strong>Rule:</strong> {event.recurrenceInterval}
		  </p>
		)}
		<p>
		  <strong>Ticket Price:</strong> ${event.ticketPrice.toFixed(2)}
		</p>
		{event.priceId && (
		  <p>
			<strong>Price ID:</strong> {event.priceId}
		  </p>
		)}
		{event.productId && (
		  <p>
			<strong>Product ID:</strong> {event.productId}
		  </p>
		)}
	  </div>

	  {event.paymentLinkUrl && (
		<a
		  href={event.paymentLinkUrl}
		  target="_blank"
		  rel="noreferrer"
		  className="inline-block bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
		>
		  Buy Ticket
		</a>
	  )}

	  <h2 className="text-xl font-semibold mt-8">Attendees</h2>
	  {loadingSubs ? (
		<p>Loading attendees…</p>
	  ) : subscribers.length > 0 ? (
		<SubscriberTable
		  subscribers={subscribers}
		  counter={subscribers.length}
		  canCopy={false}
		  onCopy={() => {}}
		  onDownload={() => {}}
		/>
	  ) : (
		<p className="text-gray-500">No attendees have registered yet.</p>
	  )}
	</main>
  )
}
