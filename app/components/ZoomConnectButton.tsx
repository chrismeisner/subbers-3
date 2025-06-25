// File: app/components/ZoomConnectButton.tsx

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function ZoomConnectButton() {
  const router = useRouter()

  const handleConnect = () => {
	// Kick off the OAuth flow
	router.push('/api/zoom/connect')
  }

  return (
	<button
	  onClick={handleConnect}
	  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
	>
	  Connect Zoom
	</button>
  )
}
