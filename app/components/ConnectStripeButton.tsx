// File: app/components/ConnectStripeButton.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function ConnectStripeButton() {
  const router = useRouter()
  const handleConnect = () => {
	router.push('/api/stripe/connect')
  }

  return (
	<button
	  onClick={handleConnect}
	  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
	>
	  Connect to Stripe
	</button>
  )
}
