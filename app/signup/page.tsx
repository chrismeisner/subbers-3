// File: app/signup/page.tsx

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setUserEmail } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault()
	setError(null)
	setLoading(true)

	try {
	  const res = await fetch('/api/signup', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, email }),
	  })
	  const body = await res.json()
	  if (!res.ok) {
		throw new Error(body.error || `HTTP ${res.status}`)
	  }

	  // Persist login in context/localStorage
	  setUserEmail(email)
	  // Redirect to Create Event page
	  router.push('/create-event')
	} catch (err: any) {
	  setError(err.message)
	} finally {
	  setLoading(false)
	}
  }

  return (
	<main className="p-6 max-w-md mx-auto">
	  <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
	  <form onSubmit={handleSubmit} className="space-y-4">
		{error && <p className="text-red-600">{error}</p>}
		<div>
		  <label htmlFor="name" className="block mb-1 font-medium">
			Name
		  </label>
		  <input
			id="name"
			type="text"
			required
			value={name}
			onChange={e => setName(e.target.value)}
			placeholder="Your name"
			className="w-full border p-2 rounded"
		  />
		</div>
		<div>
		  <label htmlFor="email" className="block mb-1 font-medium">
			Email
		  </label>
		  <input
			id="email"
			type="email"
			required
			value={email}
			onChange={e => setEmail(e.target.value)}
			placeholder="you@example.com"
			className="w-full border p-2 rounded"
		  />
		</div>
		<button
		  type="submit"
		  disabled={loading}
		  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition"
		>
		  {loading ? 'Signing up…' : 'Sign Up'}
		</button>
	  </form>
	</main>
  )
}
