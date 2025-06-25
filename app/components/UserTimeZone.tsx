// File: app/components/UserTimeZone.tsx

'use client'

import React, { useState, useEffect } from 'react'

type TimeZoneOption = {
  label: string
  value: string
}

const TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  { label: 'Eastern Time',    value: 'America/New_York' },
  { label: 'Central Time',    value: 'America/Chicago' },
  { label: 'Mountain Time',   value: 'America/Denver' },
  { label: 'Pacific Time',    value: 'America/Los_Angeles' },
  { label: 'Alaska Time',     value: 'America/Anchorage' },
  { label: 'Hawaii Time',     value: 'Pacific/Honolulu' },
]

export default function UserTimeZone() {
  const [timeZone, setTimeZone] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch or detect and persist user's time zone on mount
  useEffect(() => {
	async function fetchAndPersistTZ() {
	  try {
		// 1) Fetch existing
		const res = await fetch('/api/users/timezone')
		const body = await res.json()
		if (!res.ok) throw new Error(body.error || `API ${res.status}`)
		const existing: string | null = body.timeZone

		// 2) If not set, detect and save
		if (!existing) {
		  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
		  setTimeZone(detected)
		  await fetch('/api/users/timezone', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ timeZone: detected }),
		  })
		} else {
		  setTimeZone(existing)
		}
	  } catch (err: any) {
		setError(err.message)
	  } finally {
		setLoading(false)
	  }
	}
	fetchAndPersistTZ()
  }, [])

  // Handle manual change
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
	const newTZ = e.target.value
	setSaving(true)
	setError(null)
	try {
	  const res = await fetch('/api/users/timezone', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ timeZone: newTZ }),
	  })
	  const body = await res.json()
	  if (!res.ok) throw new Error(body.error || `API ${res.status}`)
	  setTimeZone(body.timeZone)
	  setEditing(false)
	} catch (err: any) {
	  setError(err.message)
	} finally {
	  setSaving(false)
	}
  }

  if (loading) return <p>Loading time zone…</p>
  if (error) return <p className="text-red-600">Error: {error}</p>

  return (
	<div className="mb-4">
	  <label className="block font-medium mb-1">Time Zone</label>

	  {!editing ? (
		<div className="flex items-center space-x-2">
		  <span>
			{TIME_ZONE_OPTIONS.find(opt => opt.value === timeZone)?.label ||
			 timeZone}
		  </span>
		  <button
			onClick={() => setEditing(true)}
			className="text-blue-600 underline text-sm"
		  >
			Change
		  </button>
		</div>
	  ) : (
		<div className="flex items-center space-x-2">
		  <select
			value={timeZone || ''}
			onChange={handleChange}
			disabled={saving}
			className="border p-2 rounded"
		  >
			{TIME_ZONE_OPTIONS.map(opt => (
			  <option key={opt.value} value={opt.value}>
				{opt.label}
			  </option>
			))}
		  </select>
		  <button
			onClick={() => setEditing(false)}
			disabled={saving}
			className="text-gray-600 underline text-sm"
		  >
			Cancel
		  </button>
		  {saving && <span className="text-sm text-gray-500">Saving…</span>}
		</div>
	  )}
	</div>
  )
}
