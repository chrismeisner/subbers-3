// File: app/zoom/meetings/create/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateZoomMeetingPage() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [meeting, setMeeting] = useState<any>(null)

  async function handleSubmit(e: React.FormEvent) {
	e.preventDefault()
	setError(null)

	if (!topic.trim() || !startTime) {
	  setError('Please provide both a topic and start time.')
	  return
	}

	setLoading(true)
	try {
	  // convert local-datetime to full ISO string
	  const isoStart = new Date(startTime).toISOString()

	  const res = await fetch('/api/zoom/meetings', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ topic: topic.trim(), startTime: isoStart, duration })
	  })

	  const body = await res.json()
	  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)

	  setMeeting(body.meeting)
	} catch (err: any) {
	  setError(err.message)
	} finally {
	  setLoading(false)
	}
  }

  if (meeting) {
	return (
	  <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
		<h2 className="text-2xl font-bold mb-4">Meeting Created 🎉</h2>
		<p><strong>ID:</strong> {meeting.id}</p>
		<p><strong>Topic:</strong> {meeting.topic}</p>
		<p><strong>Start Time:</strong> {meeting.start_time}</p>
		<p><strong>Duration:</strong> {meeting.duration} minutes</p>
		<p className="mt-4">
		  <a
			href={meeting.join_url}
			target="_blank"
			rel="noreferrer"
			className="text-blue-600 underline"
		  >
			Join URL
		  </a>
		</p>
		<button
		  onClick={() => router.refresh()}
		  className="mt-6 px-4 py-2 bg-gray-200 rounded"
		>
		  Create Another
		</button>
	  </div>
	)
  }

  return (
	<div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
	  <h1 className="text-2xl font-bold mb-6">Schedule a Zoom Meeting</h1>
	  {error && <p className="text-red-600 mb-4">{error}</p>}
	  <form onSubmit={handleSubmit} className="space-y-4">
		<div>
		  <label htmlFor="topic" className="block font-medium">Topic</label>
		  <input
			id="topic"
			type="text"
			value={topic}
			onChange={e => setTopic(e.target.value)}
			required
			className="mt-1 w-full border px-3 py-2 rounded"
		  />
		</div>
		<div>
		  <label htmlFor="startTime" className="block font-medium">Start Time</label>
		  <input
			id="startTime"
			type="datetime-local"
			value={startTime}
			onChange={e => setStartTime(e.target.value)}
			required
			className="mt-1 w-full border px-3 py-2 rounded"
		  />
		</div>
		<div>
		  <label htmlFor="duration" className="block font-medium">Duration (minutes)</label>
		  <input
			id="duration"
			type="number"
			min={1}
			value={duration}
			onChange={e => setDuration(Number(e.target.value))}
			className="mt-1 w-24 border px-3 py-2 rounded"
		  />
		</div>
		<button
		  type="submit"
		  disabled={loading}
		  className="w-full bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
		>
		  {loading ? 'Scheduling…' : 'Schedule Meeting'}
		</button>
	  </form>
	</div>
  )
}
