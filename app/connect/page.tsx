// File: app/connect/page.tsx

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ConnectPage() {
  const router = useRouter()
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null)
  const [stripeEmail, setStripeEmail] = useState<string | null>(null)
  const [dashboardName, setDashboardName] = useState<string | null>(null)
  const [stripeLoginLink, setStripeLoginLink] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  // On mount, ask our API if the user is already connected
  useEffect(() => {
	async function fetchStripeStatus() {
	  try {
		const res = await fetch('/api/stripe/status')
		const data = await res.json()
		console.log('[ConnectPage] Stripe status:', data)

		setStripeConnected(!!data.connected)
		setStripeEmail(data.email ?? null)
		setDashboardName(data.dashboardName ?? null)
		setStripeLoginLink(data.loginLink ?? null)
	  } catch (err) {
		console.error('[ConnectPage] Error fetching Stripe status', err)
		setStripeConnected(false)
	  }
	}
	fetchStripeStatus()
  }, [])

  // Kick off the OAuth flow
  const handleConnect = () => {
	router.push('/api/stripe/connect')
  }

  // Disconnect the Stripe account
  const handleDisconnect = async () => {
	setDisconnecting(true)
	try {
	  const res = await fetch('/api/stripe/disconnect', { method: 'POST' })
	  if (!res.ok) throw new Error('Failed to disconnect')
	  // reset local state
	  setStripeConnected(false)
	  setStripeEmail(null)
	  setDashboardName(null)
	  setStripeLoginLink(null)
	  console.log('[ConnectPage] Disconnected from Stripe')
	} catch (err: any) {
	  console.error('[ConnectPage] Error disconnecting:', err)
	} finally {
	  setDisconnecting(false)
	}
  }

  // Fetch and log the Stripe account email
  const handleGetStripeEmail = async () => {
	try {
	  const res = await fetch('/api/stripe/status')
	  const data = await res.json()
	  if (res.ok) {
		console.log('[ConnectPage] Stripe account email:', data.email)
	  } else {
		console.error('[ConnectPage] Failed to fetch Stripe email:', data.error)
	  }
	} catch (err) {
	  console.error('[ConnectPage] Error fetching Stripe email:', err)
	}
  }

  return (
	<main className="p-6 max-w-3xl mx-auto">
	  <h1 className="text-2xl font-bold mb-4">Connect your Stripe account</h1>

	  {stripeConnected === null && (
		<p className="mb-4">Checking Stripe connection…</p>
	  )}

	  {stripeConnected && dashboardName && (
		<p className="mb-2">
		  Dashboard name: <span className="font-medium">{dashboardName}</span>
		</p>
	  )}

	  {stripeConnected && stripeEmail && (
		<p className="mb-2">
		  You’re connected as <span className="font-mono">{stripeEmail}</span>
		</p>
	  )}

	  {stripeConnected && !stripeEmail && (
		<p className="mb-2">You’re connected to Stripe (email not available).</p>
	  )}

	  {stripeConnected && (
		<>
		  {stripeLoginLink ? (
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
		  )}

		  <p className="mt-4">
			<a
			  href="#"
			  onClick={e => {
				e.preventDefault()
				handleGetStripeEmail()
			  }}
			  className="text-sm text-blue-600 underline"
			>
			  Get Stripe email
			</a>
		  </p>

		  <div className="flex items-center space-x-4">
			<button
			  onClick={handleDisconnect}
			  disabled={disconnecting}
			  className="bg-red-600 text-white px-4 py-2 rounded"
			>
			  {disconnecting ? 'Disconnecting…' : 'Disconnect Stripe'}
			</button>
			<button
			  onClick={() => router.push('/dashboard')}
			  className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
			>
			  Go to Dashboard
			</button>
		  </div>
		</>
	  )}

	  {!stripeConnected && (
		<button
		  onClick={handleConnect}
		  className="bg-blue-600 text-white px-4 py-2 rounded"
		>
		  Connect Stripe
		</button>
	  )}
	</main>
  )
}
