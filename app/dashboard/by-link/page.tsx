// File: app/dashboard/by-link/page.tsx

'use client'

import React, { useState } from 'react'

type Subscriber = {
  sessionId: string
  email?: string
  customerId?: string
  subscriptionId?: string
  created: string
}

type FoundLink = {
  paymentLinkId: string
  paymentLinkUrl: string
  priceId?: string
}

export default function ByLinkLookup() {
  console.log('🔧 ByLinkLookup component mounted')
  const [linkId, setLinkId] = useState('')
  const [productId, setProductId] = useState('')
  const [foundLink, setFoundLink] = useState<FoundLink | null>(null)
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [loadingSubs, setLoadingSubs] = useState(false)

  const lookupLink = async () => {
	console.log('🔍 lookupLink called with productId:', productId)
	setLoadingLinks(true)
	setError(null)
	setFoundLink(null)
	try {
	  const res = await fetch(
		`/api/payment-links?productId=${encodeURIComponent(productId)}`
	  )
	  const body = await res.json()
	  console.log('📡 lookupLink API response:', body)
	  if (!res.ok) throw new Error(body.error || 'Lookup failed')
	  if (!body.data) {
		console.warn('⚠️ No payment link found for productId:', productId)
		setError(body.message || 'No link found')
	  } else {
		console.log('✅ Payment link found:', body.data.paymentLinkId)
		setFoundLink(body.data)
	  }
	} catch (e: any) {
	  console.error('❌ lookupLink error:', e)
	  setError(e.message)
	} finally {
	  setLoadingLinks(false)
	}
  }

  const lookupSubs = async () => {
	console.log('🔍 lookupSubs called with linkId:', linkId)
	setLoadingSubs(true)
	setError(null)
	setSubs([])
	try {
	  const res = await fetch(
		`/api/subscribers/by-link?linkId=${encodeURIComponent(linkId)}`
	  )
	  const body = await res.json()
	  console.log('📡 lookupSubs API response:', body)
	  if (!res.ok) throw new Error(body.error || 'Lookup failed')
	  console.log(
		'✅ Subscribers found:',
		Array.isArray(body.data) ? body.data.length : 0
	  )
	  setSubs(body.data)
	} catch (e: any) {
	  console.error('❌ lookupSubs error:', e)
	  setError(e.message)
	} finally {
	  setLoadingSubs(false)
	}
  }

  return (
	<div className="p-6 max-w-2xl mx-auto space-y-6">
	  <h1 className="text-2xl font-bold">One-Off Tools</h1>

	  {/* === Product → Payment Link lookup === */}
	  <section className="space-y-2">
		<h2 className="font-semibold">Find Payment Link for a Product</h2>
		<div className="flex space-x-2">
		  <input
			type="text"
			placeholder="Enter prod_…"
			value={productId}
			onChange={e => setProductId(e.target.value)}
			className="flex-grow border p-2 rounded"
		  />
		  <button
			onClick={lookupLink}
			disabled={loadingLinks || !productId}
			className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
		  >
			{loadingLinks ? 'Looking…' : 'Lookup Link'}
		  </button>
		</div>
		{foundLink && (
		  <div className="mt-2 space-y-1">
			<p>
			  <strong>Product ID:</strong> {productId}
			</p>
			<p>
			  <strong>Price ID:</strong> {foundLink.priceId}
			</p>
			<p>
			  <strong>Link ID:</strong> {foundLink.paymentLinkId}
			</p>
			<p>
			  <strong>URL:</strong>{' '}
			  <a
				href={foundLink.paymentLinkUrl}
				target="_blank"
				className="underline text-blue-600"
			  >
				{foundLink.paymentLinkUrl}
			  </a>
			</p>
		  </div>
		)}
	  </section>

	  <hr />

	  {/* === Link → Subscribers lookup === */}
	  <section className="space-y-2">
		<h2 className="font-semibold">Lookup Subscribers by Payment Link</h2>
		<div className="flex space-x-2">
		  <input
			type="text"
			placeholder="Enter plink_…"
			value={linkId}
			onChange={e => setLinkId(e.target.value)}
			className="flex-grow border p-2 rounded"
		  />
		  <button
			onClick={lookupSubs}
			disabled={loadingSubs || !linkId}
			className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
		  >
			{loadingSubs ? 'Looking…' : 'Lookup Subscribers'}
		  </button>
		</div>
		{subs.length > 0 && (
		  <table className="w-full border-collapse mt-4">
			<thead>
			  <tr className="bg-gray-200">
				<th className="p-2">Session ID</th>
				<th className="p-2">Email</th>
				<th className="p-2">Subscription ID</th>
				<th className="p-2">Created</th>
			  </tr>
			</thead>
			<tbody>
			  {subs.map((s, i) => (
				<tr key={i} className="border-t">
				  <td className="p-2 font-mono text-sm">{s.sessionId}</td>
				  <td className="p-2">{s.email || '—'}</td>
				  <td className="p-2">{s.subscriptionId || '—'}</td>
				  <td className="p-2">{new Date(s.created).toLocaleString()}</td>
				</tr>
			  ))}
			</tbody>
		  </table>
		)}
	  </section>

	  {error && <p className="text-red-600 mt-4">{error}</p>}
	</div>
  )
}
