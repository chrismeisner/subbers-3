// File: app/providers.tsx
'use client'

import { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import { AuthProvider } from './context/AuthContext'
import { WireframeProvider } from './context/WireframeContext'
import Header from './components/Header'

interface ProvidersProps {
  children: ReactNode
  // `session` will be populated by `getServerSession` in your root layout (if used)
  session?: Session
}

export default function Providers({ children, session }: ProvidersProps) {
  return (
	<WireframeProvider>
	  <SessionProvider session={session}>
		<AuthProvider>
		  <Header />
		  {children}
		</AuthProvider>
	  </SessionProvider>
	</WireframeProvider>
  )
}
