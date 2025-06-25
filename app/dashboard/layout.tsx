// File: app/dashboard/layout.tsx

import { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Dashboard – Subbers-3',
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const userEmail = cookieStore.get('userEmail')?.value

  if (!userEmail) {
	// If not authenticated, redirect to login
	redirect('/login')
  }

  return (
	<div className="min-h-screen bg-gray-50">
	  {children}
	</div>
  )
}
