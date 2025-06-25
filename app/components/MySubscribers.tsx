// File: app/components/MySubscribers.tsx

'use client'

import React, { useState, useEffect } from 'react'
import SubscriberTable, { Subscriber } from './SubscriberTable'

export default function MySubscribers() {
  const API = process.env.NEXT_PUBLIC_API_URL!
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [counter, setCounter] = useState<number>(0)
  const [emailsCSV, setEmailsCSV] = useState<string>('')
  const [canCopy, setCanCopy] = useState<boolean>(false)
  const [syncing, setSyncing] = useState<boolean>(false)

  // On mount: load from cache (if fresh) or fetch
  useEffect(() => {
	const cachedData = localStorage.getItem('mySubscribersData')
	const cachedTime = localStorage.getItem('mySubscribersLastSync')
	if (cachedData && cachedTime) {
	  const ageMs = Date.now() - new Date(cachedTime).getTime()
	  const TTL = 3 * 60 * 60 * 1000 // 3 hours
	  if (ageMs < TTL) {
		const data: Subscriber[] = JSON.parse(cachedData)
		setSubscribers(data)
		setCounter(data.length)
		setLastSynced(cachedTime)
		buildCSV(data)
		return
	  }
	}
	fetchMySubscribers()
  }, [])

  // Fetch from Airtable
  async function fetchMySubscribers() {
	setLoading(true)
	setError(null)
	try {
	  const res = await fetch(`${API}/my-subscribers`)
	  const body = await res.json()
	  if (!res.ok) throw new Error((body as any).error || `API ${res.status}`)
	  const data = body.data as Subscriber[]
	  setSubscribers(data)
	  setCounter(data.length)
	  buildCSV(data)

	  // Cache results
	  const now = new Date().toISOString()
	  localStorage.setItem('mySubscribersData', JSON.stringify(data))
	  localStorage.setItem('mySubscribersLastSync', now)
	  setLastSynced(now)
	} catch (err: any) {
	  console.error('[MySubscribers] fetch error:', err)
	  setError(err.message)
	} finally {
	  setLoading(false)
	}
  }

  // Build CSV & enable copy/download
  function buildCSV(data: Subscriber[]) {
	if (!data.length) return
	const lines = [
	  ['Subscription ID','Plan Name','Product Name','Name','Email','Phone','Status','Created','Current Period End'],
	  ...data.map(s => [
		s.subscriptionId,
		s.planName,
		s.productName,
		s.name,
		s.email,
		s.phone,
		s.status,
		s.createdDate,
		s.currentPeriodEndDate,
	  ]),
	]
	setEmailsCSV(lines.map(l => l.join(',')).join('\n'))
	setCanCopy(true)
  }

  // Manual sync handler
  async function handleSync() {
	console.log('[MySubscribers] syncing these records:', subscribers)
	console.log('[MySubscribers] Starting sync...')
	setSyncing(true)
	try {
	  const res = await fetch('/api/subscribers', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ subscribers }),
	  })
	  const body = await res.json()
	  if (!res.ok) throw new Error(body.error || `API ${res.status}`)
	  console.log('[MySubscribers] Sync result:', body)
	  await fetchMySubscribers()
	} catch (e: any) {
	  console.error('[MySubscribers] Sync failed:', e)
	  alert(`Sync error: ${e.message}`)
	} finally {
	  setSyncing(false)
	}
  }

  if (loading) {
	return <p>Loading...</p>
  }
  if (error) {
	return <p className="text-red-600">{error}</p>
  }

  return (
	<div className="space-y-4">
	  <h2 className="text-xl font-semibold">My Subscribers</h2>
	  {lastSynced && (
		<p className="text-sm text-gray-500">
		  Last synced: {new Date(lastSynced).toLocaleString()}
		</p>
	  )}
	  <SubscriberTable
		subscribers={subscribers}
		counter={counter}
		canCopy={canCopy}
		onCopy={() => navigator.clipboard.writeText(emailsCSV)}
		onDownload={() => {
		  const blob = new Blob([emailsCSV], { type: 'text/csv' })
		  const url = URL.createObjectURL(blob)
		  const a = document.createElement('a')
		  a.href = url
		  a.download = 'my_subscribers.csv'
		  document.body.appendChild(a)
		  a.click()
		  document.body.removeChild(a)
		}}
	  />
	  <button
		onClick={handleSync}
		disabled={syncing}
		className={`mt-2 px-4 py-2 rounded ${
		  syncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white'
		}`}
	  >
		{syncing ? 'Syncing...' : 'Sync Now'}
	  </button>
	</div>
  )
}
