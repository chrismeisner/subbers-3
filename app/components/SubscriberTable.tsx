// File: app/components/SubscriberTable.tsx

'use client'

import React, { useState, useEffect } from 'react'
import UserTimeZone from './UserTimeZone'
import { formatInTZ } from '@/utils/dateUtils'

export type Subscriber = {
  subscriptionId: string
  planName: string
  productName: string
  name: string
  email: string
  phone: string
  status: string
  createdDate: string
  currentPeriodEndDate: string
}

interface Props {
  subscribers: Subscriber[]
  counter: number
  canCopy: boolean
  onCopy: () => void
  onDownload: () => void
}

export default function SubscriberTable({
  subscribers,
  counter,
  canCopy,
  onCopy,
  onDownload,
}: Props) {
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

  return (
	<>
	  <UserTimeZone />

	  <div className="space-y-4 mt-4">
		<div className="flex items-center justify-between">
		  <span className="font-bold">{counter} subscribers found</span>
		  <div className="space-x-2">
			<button
			  onClick={onCopy}
			  disabled={!canCopy}
			  className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
			>
			  Copy Email Addresses
			</button>
			<button
			  onClick={onDownload}
			  disabled={!canCopy}
			  className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
			>
			  Download CSV
			</button>
		  </div>
		</div>
		{subscribers.length > 0 && (
		  <div className="overflow-auto">
			<table className="w-full table-auto border">
			  <thead>
				{/* header row must have no whitespace text nodes */}
				<tr className="bg-gray-200">
				  <th className="px-2 py-1 text-left">Subscription ID</th>
				  <th className="px-2 py-1 text-left">Plan Name</th>
				  <th className="px-2 py-1 text-left">Product Name</th>
				  <th className="px-2 py-1 text-left">Name</th>
				  <th className="px-2 py-1 text-left">Email</th>
				  <th className="px-2 py-1 text-left">Phone</th>
				  <th className="px-2 py-1 text-left">Status</th>
				  <th className="px-2 py-1 text-left">Created</th>
				  <th className="px-2 py-1 text-left">Period End</th>
				</tr>
			  </thead>
			  <tbody>
				{subscribers.map((s, i) => (
				  /* each data row must not introduce whitespace nodes */
				  <tr key={i} className="border-t">
					<td className="px-2 py-1">{s.subscriptionId}</td>
					<td className="px-2 py-1">{s.planName}</td>
					<td className="px-2 py-1">{s.productName}</td>
					<td className="px-2 py-1">{s.name}</td>
					<td className="px-2 py-1">{s.email}</td>
					<td className="px-2 py-1">{s.phone}</td>
					<td className="px-2 py-1">{s.status}</td>
					<td className="px-2 py-1">
					  {formatInTZ(s.createdDate, timeZone)}
					</td>
					<td className="px-2 py-1">
					  {formatInTZ(s.currentPeriodEndDate, timeZone)}
					</td>
				  </tr>
				))}
			  </tbody>
			</table>
		  </div>
		)}
		{subscribers.length === 0 && (
		  <p className="text-red-600">No matching subscribers.</p>
		)}
	  </div>
	</>
  )
}
