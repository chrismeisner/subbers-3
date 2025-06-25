// File: app/login/page.tsx

'use client'

import React from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()

  // Redirect to dashboard if already signed in
  React.useEffect(() => {
	if (status === 'authenticated') {
	  router.push('/dashboard')
	}
  }, [status, router])

  if (status === 'loading') {
	return <p>Loading…</p>
  }

  return (
	<main className="p-6 max-w-md mx-auto text-center space-y-6">
	  <h1 className="text-3xl font-bold">Sign in to Subbers-3</h1>
	  <button
		onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
		className="w-full flex items-center justify-center space-x-3 border border-gray-300 rounded px-4 py-2 hover:bg-gray-50 transition"
	  >
		<img
		  src="/google-logo.png"
		  alt="Google logo"
		  className="h-6 w-6"
		/>
		<span>Sign in with Google</span>
	  </button>
	  <p className="text-sm text-gray-600">
		You’ll be redirected to your Google account to sign in.
	  </p>
	</main>
  )
}
