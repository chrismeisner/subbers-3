// app/components/ConnectZoomButton.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function ConnectZoomButton() {
  const router = useRouter()

  const onClick = React.useCallback(() => {
	// kick off OAuth flow
	window.location.href = '/api/zoom/connect'
  }, [])

  return (
	<button
	  onClick={onClick}
	  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
	>
	  Connect to Zoom
	</button>
  )
}
