// File: app/zoom/page.tsx

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ZoomStatus {
  connected: boolean
  email?: string | null
  accountId?: string | null
}

export default function ZoomConnectPage() {
  const router = useRouter()
  const [status, setStatus] = useState<ZoomStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  // Fetch Zoom connection status on mount
  useEffect(() => {
	async function fetchStatus() {
	  try {
		const res = await fetch('/api/zoom/status')
		const data = await res.json()
		setStatus(data)
	  } catch (err) {
		console.error('Error fetching Zoom status', err)
		setStatus({ connected: false })
	  } finally {
		setLoading(false)
	  }
	}
	fetchStatus()
  }, [])

  const handleConnect = () => {
	// Launch the OAuth flow
	router.push('/api/zoom/connect')
  }

  const handleDisconnect = async () => {
	setDisconnecting(true)
	try {
	  const res = await fetch('/api/zoom/disconnect', { method: 'POST' })
	  if (!res.ok) throw new Error('Failed to disconnect')
	  setStatus({ connected: false })
	} catch (err) {
	  console.error('Error disconnecting Zoom', err)
	} finally {
	  setDisconnecting(false)
	}
  }

  if (loading) {
	return <p>Checking Zoom connection…</p>
  }

  return (
	<main className="p-6 max-w-lg mx-auto">
	  <h1 className="text-2xl font-bold mb-4">Connect your Zoom account</h1>

	  {status?.connected ? (
		<>
		  <p className="mb-2">
			Connected as{' '}
			<span className="font-mono">{status.email || 'Unknown Email'}</span>
		  </p>
		  {status.accountId && (
			<p className="mb-4">
			  Zoom Account ID: <span className="font-mono">{status.accountId}</span>
			</p>
		  )}

		  <div className="flex space-x-4">
			<a
			  href="https://zoom.us/profile"
			  target="_blank"
			  rel="noreferrer"
			  className="underline text-blue-600"
			>
			  Go to Zoom Profile
			</a>
			<button
			  onClick={handleDisconnect}
			  disabled={disconnecting}
			  className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
			>
			  {disconnecting ? 'Disconnecting…' : 'Disconnect Zoom'}
			</button>
		  </div>
		</>
	  ) : (
		<button
		  onClick={handleConnect}
		  className="bg-blue-600 text-white px-4 py-2 rounded"
		>
		  Connect Zoom
		</button>
	  )}
	</main>
  )
}
