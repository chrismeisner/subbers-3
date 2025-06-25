// File: app/components/Header.tsx

'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
	<header className="bg-white shadow">
	  <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
		<Link href="/">
		  <h1 className="text-2xl font-bold">Subbers-3</h1>
		</Link>

		{status === 'loading' ? (
		  <p className="text-sm text-gray-500">Loading…</p>
		) : session ? (
		  <div className="flex items-center space-x-4">
			<span className="text-sm text-gray-700">
			  {session.user?.name ?? session.user?.email}
			</span>
			<button
			  onClick={() => signOut({ callbackUrl: '/login' })}
			  className="text-sm text-blue-600 hover:underline"
			>
			  Logout
			</button>
		  </div>
		) : (
		  <button
			onClick={() => signIn('google', { callbackUrl: '/login' })}
			className="text-sm text-blue-600 hover:underline"
		  >
			Login
		  </button>
		)}
	  </div>
	</header>
  )
}
