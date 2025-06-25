// File: app/create-event/success/page.tsx

'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'react-qr-code'

export default function EventSuccessPage() {
  const params = useSearchParams()
  const eventId = params.get('id')
  const [eventName, setEventName] = useState<string>('')
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string>('')
  const [copied, setCopied] = useState<boolean>(false)

  useEffect(() => {
	if (eventId) {
	  fetch(`/api/events/${eventId}`)
		.then(res => res.json())
		.then(body => {
		  const data = body.data
		  if (data) {
			if (data.name) setEventName(data.name)
			if (data.paymentLinkUrl) setPaymentLinkUrl(data.paymentLinkUrl)
		  }
		})
		.catch(() => {
		  // ignore errors
		})
	}
  }, [eventId])

  const handleCopy = () => {
	if (!paymentLinkUrl) return
	navigator.clipboard.writeText(paymentLinkUrl).then(() => {
	  setCopied(true)
	  setTimeout(() => setCopied(false), 2000)
	})
  }

  return (
	<main className="p-6 max-w-md mx-auto text-center space-y-4">
	  <h1 className="text-3xl font-bold text-green-600">🎉 Event Created!</h1>
	  {eventName && (
		<p className="text-lg">“{eventName}” has been created successfully.</p>
	  )}
	  {paymentLinkUrl && (
		<div className="flex flex-col items-center space-y-4">
		  <div className="inline-block bg-white p-2">
			<QRCode value={paymentLinkUrl} />
		  </div>
		  <div className="flex space-x-2">
			<a
			  href={paymentLinkUrl}
			  target="_blank"
			  rel="noopener noreferrer"
			  className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
			>
			  Open Payment Link
			</a>
			<button
			  onClick={handleCopy}
			  className="inline-block px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring"
			>
			  {copied ? 'Copied!' : 'Copy Link'}
			</button>
		  </div>
		</div>
	  )}
	  <div className="space-x-4">
		{eventId && (
		  <Link
			href={`/dashboard/events/${eventId}`}
			className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
		  >
			View Event
		  </Link>
		)}
		<Link
		  href="/create-event"
		  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
		>
		  Create Another
		</Link>
	  </div>
	</main>
  )
}
