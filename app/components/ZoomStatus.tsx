// File: app/components/ZoomStatus.tsx

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type ZoomUser = {
  id: string
  email: string | null
  name: string | null
}

export default function ZoomStatus() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState<boolean>(false)
  const [user, setUser] = useState<ZoomUser | null>(null)

  useEffect(() => {
	async function fetchStatus() {
	  try {
		const res = await fetch('/api/zoom/status')
		const json = await res.json()
		setConnected(json.connected)
		if (json.connected && json.user) {
		  setUser({
			id: json.user.id,
			email: json.user.email,
			name: json.user.name,
		  })
		}
	  } catch (err) {
		console.error('Zoom status error', err)
	  } finally {
		setLoading(false)
	  }
	}
	fetchStatus()
  }, [])

  const handleConnect = () => {
	router.push('/api/zoom/connect')
  }

  const handleDisconnect = async () => {
	try {
	  await fetch('/api/zoom/disconnect', { method: 'POST' })
	  setConnected(false)
	  setUser(null)
	} catch (err) {
	  console.error('Zoom disconnect error', err)
	}
  }

  if (loading) {
	return <p>Loading Zoom status…</p>
  }

  return (
	<section className="mb-8 p-4 border rounded bg-white">
	  <h2 className="text-xl font-semibold mb-2">Zoom Connection</h2>

	  {connected ? (
		<>
		  <p className="mb-2">
			Connected as{' '}
			<span className="font-medium">
			  {user?.email ?? user?.name ?? 'Unknown User'}
			</span>
		  </p>
		  <button
			onClick={handleDisconnect}
			className="bg-red-600 text-white px-4 py-2 rounded"
		  >
			Disconnect Zoom
		  </button>
		</>
	  ) : (
		<button
		  onClick={handleConnect}
		  className="bg-blue-600 text-white px-4 py-2 rounded"
		>
		  Connect Zoom
		</button>
	  )}
	</section>
  )
}
