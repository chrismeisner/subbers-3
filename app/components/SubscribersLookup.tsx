// File: app/components/SubscribersLookup.tsx

'use client'

import React, { useState, useEffect } from 'react'
import UserTimeZone from './UserTimeZone'
import SubscriberTable, { Subscriber } from './SubscriberTable'

type PriceOption = {
  value: string
  label: string
  priceId: string
  productId: string
}

type Customer = { id: string; name?: string; email: string; phone?: string }
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
		product: { id: string; name: string } | string
	  }
	}>
  }
  current_period_end: number
  created: number
  status: string
  customer: string
}

type AirtableResult = { created?: number; updated?: number; error?: string }

export default function SubscribersLookup() {
  const API = process.env.NEXT_PUBLIC_API_URL!
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([])
  const [subscriptionType, setSubscriptionType] = useState<string>('')
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [counter, setCounter] = useState(0)
  const [canCopy, setCanCopy] = useState(false)
  const [emailsCSV, setEmailsCSV] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // User’s stored time zone (fallback to browser detection)
  const [timeZone, setTimeZone] = useState<string>(
	Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  useEffect(() => {
	async function fetchTZ() {
	  try {
		const res = await fetch('/api/users/timezone')
		const body = await res.json()
		setTimeZone(body.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone)
	  } catch {
		setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
	  }
	}
	fetchTZ()
  }, [])

  // Load dropdown options (cached 1h)
  useEffect(() => {
	loadPriceOptions()
  }, [API])

  async function loadPriceOptions() {
	const CACHE_KEY = 'priceOptionsCache_v2'
	const TIME_KEY = 'priceOptionsCacheTime_v2'
	const TTL = 60 * 60 * 1000
	const now = Date.now()

	const cachedData = localStorage.getItem(CACHE_KEY)
	const cachedTime = localStorage.getItem(TIME_KEY)
	if (cachedData && cachedTime && now - parseInt(cachedTime, 10) < TTL) {
	  const opts: PriceOption[] = JSON.parse(cachedData)
	  setPriceOptions(opts)
	  if (opts.length) setSubscriptionType(opts[0].productId)
	  setLastUpdated(parseInt(cachedTime, 10))
	} else {
	  try {
		const res = await fetch(`${API}/prices`)
		const body = await res.json()
		if (!res.ok) throw new Error(body.error || 'No options')
		const opts: PriceOption[] = (body.options ?? []).map((o: any) => ({
		  value: o.value,
		  label: o.label,
		  priceId: o.priceId,
		  productId: o.productId,
		}))
		localStorage.setItem(CACHE_KEY, JSON.stringify(opts))
		localStorage.setItem(TIME_KEY, now.toString())
		setPriceOptions(opts)
		if (opts.length) setSubscriptionType(opts[0].productId)
		setLastUpdated(now)
	  } catch (err) {
		console.error('Failed to load price options:', err)
	  }
	}
  }

  async function fetchSubs() {
	console.log('🔍 Fetching subscribers for productId:', subscriptionType)
	setLoading(true)
	setSaveStatus(null)
	setCounter(0)
	setCanCopy(false)

	try {
	  const allSubs: Sub[] = []
	  let hasMore = true
	  let cursor: string | null = null

	  while (hasMore) {
		const url = new URL(`${API}/subscriptions`)
		url.searchParams.set('limit', '100')
		url.searchParams.set('productId', subscriptionType)
		if (cursor) url.searchParams.set('starting_after', cursor)

		const res = await fetch(url.toString())
		const body = await res.json()
		if (!res.ok) throw new Error((body as any).error || `API ${res.status}`)

		const { data, has_more, next_starting_after } = body as {
		  data: Sub[]
		  has_more: boolean
		  next_starting_after: string | null
		}

		allSubs.push(...data)
		hasMore = has_more
		cursor = next_starting_after
	  }

	  const matched: Subscriber[] = []
	  for (const s of allSubs) {
		const item = s.items.data[0]
		const productName =
		  typeof item.price.product !== 'string'
			? item.price.product.name
			: 'Unknown Product'
		const planName =
		  item.price.nickname ??
		  (typeof item.price.product !== 'string'
			? item.price.product.name
			: item.price.product)

		const custRes = await fetch(`${API}/customers?customerId=${s.customer}`)
		const custBody = await custRes.json()
		if (!custRes.ok) throw new Error((custBody as any).error || 'Customer fetch failed')
		const cust = (custBody as any).data as Customer

		const status = s.status === 'active' ? 'Active' : 'Inactive'

		matched.push({
		  subscriptionId: s.id,
		  planName,
		  productName,
		  name: cust.name || 'N/A',
		  email: cust.email,
		  phone: cust.phone || 'N/A',
		  status,
		  createdDate: new Date(s.created * 1000).toISOString(),
		  currentPeriodEndDate: new Date(s.current_period_end * 1000).toISOString(),
		})

		setCounter(c => c + 1)
	  }

	  const uploadRes = await fetch('/api/subscribers', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ subscribers: matched }),
	  })
	  const uploadBody: AirtableResult = await uploadRes.json()
	  if (!uploadRes.ok) throw new Error(uploadBody.error || `Upload failed ${uploadRes.status}`)

	  setSaveStatus(
		`Saved ${uploadBody.created ?? 0} new and ${uploadBody.updated ?? 0} updated records to Airtable`
	  )
	  setSubscribers(matched)

	  const csvLines = [
		['Subscription ID','Plan Name','Product Name','Name','Email','Phone','Status','Created','Current Period End'],
		...matched.map(s => [
		  s.subscriptionId,
		  s.planName,
		  s.productName,
		  s.name,
		  s.email,
		  s.phone,
		  s.status,
		  new Date(s.createdDate).toLocaleDateString(undefined, { timeZone }),
		  new Date(s.currentPeriodEndDate).toLocaleDateString(undefined, { timeZone }),
		]),
	  ]
	  const csv = csvLines.map(line => line.join(',')).join('\n')
	  setEmailsCSV(csv)
	  setCanCopy(true)
	} catch (err: any) {
	  console.error('⚠️ [SubscribersLookup] Error:', err)
	  setSaveStatus(`Error: ${err.message}`)
	} finally {
	  setLoading(false)
	}
  }

  const copyToClipboard = () => {
	navigator.clipboard.writeText(emailsCSV).then(() => alert('Copied to clipboard!'))
  }

  const downloadCsv = () => {
	const blob = new Blob([emailsCSV], { type: 'text/csv;charset=utf-8;' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.setAttribute('download', `${subscriptionType}_subscribers.csv`)
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
  }

  return (
	<>
	  <UserTimeZone />

	  <div className="space-y-4">
		<h2 className="text-xl mb-2">Subscribers Lookup</h2>
		<div className="flex items-center space-x-4 mb-2">
		  <label htmlFor="subscription-type">Select Subscription:</label>
		  <select
			id="subscription-type"
			value={subscriptionType}
			onChange={e => setSubscriptionType(e.target.value)}
			className="border p-2"
		  >
			{priceOptions.map(o => (
			  <option key={o.priceId} value={o.productId}>
				{o.label}
			  </option>
			))}
		  </select>
		  <button
			type="button"
			onClick={loadPriceOptions}
			className="text-sm text-blue-600 underline"
		  >
			Refresh subscriptions
		  </button>
		</div>
		<div className="mb-4 text-sm text-gray-500">
		  {lastUpdated
			? `Options last updated: ${new Date(lastUpdated).toLocaleString(undefined, { timeZone })}`
			: 'Loading options…'}
		</div>
		<button
		  onClick={fetchSubs}
		  disabled={loading}
		  className={`px-4 py-2 rounded text-white ${
			loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600'
		  }`}
		>
		  {loading ? 'Processing…' : 'Get Subscribers'}
		</button>
		{saveStatus && <p className="text-sm text-gray-700">{saveStatus}</p>}
		<SubscriberTable
		  subscribers={subscribers}
		  counter={counter}
		  canCopy={canCopy}
		  onCopy={copyToClipboard}
		  onDownload={downloadCsv}
		/>
	  </div>
	</>
  )
}
