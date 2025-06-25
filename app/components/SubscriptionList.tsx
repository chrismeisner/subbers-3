// File: app/components/SubscriptionList.tsx

'use client'

import React, { useState, useEffect } from 'react'
import UserTimeZone from './UserTimeZone'
import { formatInTZ } from '@/utils/dateUtils'

export type SubscriptionDetail = {
  planName: string
  amount: string
  currency: string
  interval?: string
  nextDate: string
  createdDate: string
}

interface Props {
  subscriptions: SubscriptionDetail[]
}

export default function SubscriptionList({ subscriptions }: Props) {
  const [timeZone, setTimeZone] = useState<string>(
	Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  // Load user's preferred time zone from API (overrides default if set)
  useEffect(() => {
	async function fetchTZ() {
	  try {
		const res = await fetch('/api/users/timezone')
		const body = await res.json()
		setTimeZone(
		  body.timeZone ||
		  Intl.DateTimeFormat().resolvedOptions().timeZone
		)
	  } catch {
		setTimeZone(
		  Intl.DateTimeFormat().resolvedOptions().timeZone
		)
	  }
	}
	fetchTZ()
  }, [])

  if (!subscriptions.length) {
	return (
	  <>
		<UserTimeZone />
		<p className="text-red-600">No active subscriptions.</p>
	  </>
	)
  }

  return (
	<>
	  <UserTimeZone />

	  <div className="space-y-4">
		<h2 className="text-xl font-semibold">Subscription Status</h2>
		{subscriptions.map((s, i) => (
		  <div key={i} className="p-4 border rounded bg-white">
			<p><strong>Plan:</strong> {s.planName}</p>
			<p>
			  <strong>Amount:</strong> ${s.amount} {s.currency}
			  {s.interval ? ` per ${s.interval}` : ''}
			</p>
			<p>
			  <strong>Next payment:</strong> {formatInTZ(s.nextDate, timeZone)}
			</p>
			<p>
			  <strong>Created:</strong> {formatInTZ(s.createdDate, timeZone)}
			</p>
		  </div>
		))}
	  </div>
	</>
  )
}
