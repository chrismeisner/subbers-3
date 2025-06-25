// File: app/dashboard/page.tsx

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SubscriptionList, { SubscriptionDetail } from '../components/SubscriptionList'
import SubscribersLookup from '../components/SubscribersLookup'
import MySubscribers from '../components/MySubscribers'
import EventsTable, { EventRecord } from '../components/EventsTable'
import UserTimeZone from '../components/UserTimeZone'
import ZoomStatus from '../components/ZoomStatus'
import { useAuth } from '../context/AuthContext'

type Customer = {
  id: string
  name?: string
  email: string
  phone?: string
}

type Sub = {
  id: string
  items: {
	data: Array<{
	  price: {
		id: string
		nickname: string | null
		unit_amount: number | null
		currency: string
		recurring?: { interval: string }
		product: { name: string } | string
	  }
	}>
  }
  current_period_end: number
  created: number
  status: string
  customer: string
}

export default function DashboardPage() {
  const API = process.env.NEXT_PUBLIC_API_URL!
  const router = useRouter()
  const { setUserEmail } = useAuth()

  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null)
  const [stripeEmail, setStripeEmail] = useState<string | null>(null)
  const [dashboardName, setDashboardName] = useState<string | null>(null)
  const [stripeLoginLink, setStripeLoginLink] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [results, setResults] = useState<JSX.Element | string>('')
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetail[]>([])
  const [lookupError, setLookupError] = useState<string | null>(null)

  const [events, setEvents] = useState<EventRecord[]>([])
  const [eventCounter, setEventCounter] = useState(0)
  const [eventsError, setEventsError] = useState<string | null>(null)

  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState<string | null>(null)

  const [superRunning, setSuperRunning] = useState(false)
  const [superMsg, setSuperMsg] = useState<string | null>(null)

  // Check Stripe connection status on mount
  useEffect(() => {
	async function fetchStripeStatus() {
	  try {
		const res = await fetch('/api/stripe/status')
		const data = await res.json()
		console.log('[Dashboard] Stripe status:', data)
		setStripeConnected(!!data.connected)
		setStripeEmail(data.email ?? null)
		setDashboardName(data.dashboardName ?? null)
		setStripeLoginLink(data.loginLink ?? null)
	  } catch (err) {
		console.error('[Dashboard] Failed to fetch Stripe status', err)
		setStripeConnected(false)
	  }
	}
	fetchStripeStatus()
  }, [])

  // Fetch logged-in user's events on mount
  useEffect(() => {
	async function fetchEvents() {
	  try {
		const res = await fetch(`${API}/events`)
		const body = await res.json()
		if (!res.ok) throw new Error(body.error || `API ${res.status}`)
		const data = body.data as EventRecord[]
		setEvents(data)
		setEventCounter(data.length)
	  } catch (err: any) {
		console.error('Error fetching events:', err)
		setEventsError(err.message)
	  }
	}
	fetchEvents()
  }, [API])

  async function lookup(e: React.FormEvent) {
	e.preventDefault()
	setResults('Searching…')
	setLookupError(null)
	setSubscriptionDetails([])

	try {
	  const res = await fetch(`${API}/customers?email=${encodeURIComponent(email)}`)
	  const body = await res.json()
	  if (!res.ok) throw new Error((body as any).error || `API returned ${res.status}`)
	  const list = body as { data: Customer[] }
	  if (!list.data.length) {
		setResults('')
		setLookupError('Customers not found')
		return
	  }

	  const gathered: SubscriptionDetail[] = []
	  for (const c of list.data) {
		const subsRes = await fetch(`${API}/subscriptions?customerId=${c.id}`)
		const subsBody = await subsRes.json()
		if (!subsRes.ok) throw new Error((subsBody as any).error || `API returned ${subsRes.status}`)
		const subs = subsBody as { data: Sub[] }
		subs.data.forEach(s => {
		  const item = s.items.data[0]
		  const price = item.price
		  const planNameRaw = price.nickname ?? ''
		  const planName =
			planNameRaw ||
			(typeof price.product !== 'string' ? price.product.name : price.product)
		  const amount = ((price.unit_amount ?? 0) / 100).toFixed(2)
		  const currency = price.currency.toUpperCase()
		  const interval = price.recurring?.interval
		  const nextDate = new Date(s.current_period_end * 1000).toLocaleDateString()
		  const createdDate = new Date(s.created * 1000).toLocaleDateString()
		  gathered.push({ planName, amount, currency, interval, nextDate, createdDate })
		})
	  }

	  if (!gathered.length) {
		setResults('')
		setLookupError('No subscriptions found for that email.')
	  } else {
		setResults('')
		setLookupError(null)
		setSubscriptionDetails(gathered)
	  }
	} catch (err: any) {
	  setResults('')
	  setLookupError(`Error: ${err.message}`)
	}
  }

  async function handleSuperLogout() {
	// 1) Clear server cookie
	await fetch('/api/logout', { method: 'POST' })

	// 2) Clear client caches
	localStorage.clear()

	// 3) Clear auth context
	setUserEmail(null)

	// 4) Redirect to login
	router.push('/login')
  }

  const runCron = async () => {
	setRunning(true)
	setRunMsg(null)
	try {
	  const res = await fetch('/api/reminders/run', { method: 'POST' })
	  const body = await res.json()
	  if (!res.ok) throw new Error(body.error || 'Unknown error')
	  setRunMsg('✅ Reminder job executed—check Airtable & console logs.')
	} catch (e: any) {
	  setRunMsg(`❌ Failed: ${e.message}`)
	} finally {
	  setRunning(false)
	}
  }

  const runSuperSync = async () => {
	setSuperRunning(true)
	setSuperMsg(null)
	try {
	  const res = await fetch('/api/sync/run', { method: 'POST' })
	  const body = await res.json()
	  if (!res.ok) throw new Error(body.error || 'Unknown error')
	  setSuperMsg('✅ Super sync completed—check Airtable & console logs.')
	} catch (e: any) {
	  setSuperMsg(`❌ Failed: ${e.message}`)
	} finally {
	  setSuperRunning(false)
	}
  }

  return (
	<main className="p-6 max-w-3xl mx-auto">
	  {/* Time Zone selector/display */}
	  <UserTimeZone />

	  {/* Zoom Connection */}
	  <ZoomStatus />

	  {/* Stripe Connection */}
	  <section className="mb-8 p-4 border rounded bg-white">
		<h2 className="text-xl font-semibold mb-2">Stripe Connection</h2>
		<Link href="/connect" className="underline text-blue-600 mb-4 block">
		  Stripe Connect
		</Link>
		<p className="mb-4">
		  Status:{' '}
		  {stripeConnected === null
			? 'Checking...'
			: stripeConnected
			? 'Connected'
			: 'Not connected'}
		</p>
		{stripeConnected && dashboardName && (
		  <p className="mb-2">
			Dashboard name: <span className="font-medium">{dashboardName}</span>
		  </p>
		)}
		{stripeConnected && stripeEmail && (
		  <p className="mb-2">
			Connected as <span className="font-mono">{stripeEmail}</span>
		  </p>
		)}
		{stripeConnected ? (
		  stripeLoginLink ? (
			<a
			  href={stripeLoginLink}
			  target="_blank"
			  rel="noreferrer"
			  className="underline text-blue-600 mb-4 block"
			>
			  Go to my Stripe dashboard
			</a>
		  ) : (
			<a
			  href="https://dashboard.stripe.com/"
			  target="_blank"
			  rel="noreferrer"
			  className="underline text-blue-600 mb-4 block"
			>
			  Go to my Stripe dashboard
			</a>
		  )
		) : (
		  <button
			onClick={() => router.push('/connect')}
			className="bg-blue-600 text-white px-4 py-2 rounded"
		  >
			Connect Stripe
		  </button>
		)}
	  </section>

	  {/* Stripe Subscription Lookup */}
	  <h1 className="text-2xl font-bold mb-4">Stripe Subscription Lookup</h1>
	  <a
		href="https://billing.stripe.com/p/login/7sI3et3O71b34i4aEE"
		target="_blank"
		className="underline mb-6 block"
	  >
		Manage your subscriptions
	  </a>

	  <form onSubmit={lookup} className="space-y-2 mb-6">
		<label htmlFor="email">Email Address:</label>
		<input
		  id="email"
		  type="email"
		  required
		  value={email}
		  onChange={e => setEmail(e.target.value)}
		  className="border p-2 w-full"
		/>
		<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
		  Lookup
		</button>
	  </form>

	  <div id="results" className="mb-6">
		{results === 'Searching…' && <p>Searching…</p>}
		{lookupError && <p className="text-red-600">{lookupError}</p>}
		{!lookupError && subscriptionDetails.length > 0 && (
		  <SubscriptionList subscriptions={subscriptionDetails} />
		)}
	  </div>

	  <SubscribersLookup />

	  <MySubscribers />

	  <div className="mt-10">
		<div className="flex items-center justify-between mb-4">
		  <h2 className="text-2xl font-bold">My Events</h2>
		  <Link href="/create-event" className="bg-green-600 text-white px-4 py-2 rounded">
			Create Event
		  </Link>
		</div>
		{eventsError && <p className="text-red-600">{eventsError}</p>}
		<EventsTable events={events} counter={eventCounter} />
	  </div>

	  {/* Super Log Out */}
	  <div className="mt-8 text-center">
		<button onClick={handleSuperLogout} className="text-red-600 underline">
		  Super Log Out
		</button>
	  </div>

	  {/* Manual trigger for reminder cron job */}
	  <div className="mt-6 text-center">
		<button
		  onClick={runCron}
		  disabled={running}
		  className="underline text-blue-600 hover:text-blue-800"
		>
		  {running ? 'Running…' : 'Run Reminder Job'}
		</button>
		{runMsg && <p className="mt-2 text-sm">{runMsg}</p>}
	  </div>

	  {/* Manual trigger for super sync */}
	  <div className="mt-4 text-center">
		<button
		  onClick={runSuperSync}
		  disabled={superRunning}
		  className="underline text-blue-600 hover:text-blue-800"
		>
		  {superRunning ? 'Syncing…' : 'Super Sync'}
		</button>
		{superMsg && <p className="mt-2 text-sm">{superMsg}</p>}
	  </div>
	</main>
  )
}
