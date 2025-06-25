// File: app/api/zoom/meetings/route.ts
import { NextResponse } from 'next/server'
import { getZoomClient } from '@/lib/getZoomClient'
import base from '@/lib/airtable'

export async function POST(req: Request) {
  try {
	const { topic, startTime, duration } = await req.json()

	if (!topic || !startTime || typeof duration !== 'number') {
	  return NextResponse.json(
		{ error: 'Required: topic (string), startTime (ISO), duration (minutes)' },
		{ status: 400 }
	  )
	}

	// 1) Create a scheduled Zoom meeting
	const zoom = await getZoomClient()
	const meeting = await zoom.post('/users/me/meetings', {
	  topic,
	  type: 2,
	  start_time: startTime,
	  duration,
	  settings: { join_before_host: true }
	})

	// 2) Persist into Airtable “zooms” table using camelCase field names
	await base('zooms').create([
	  {
		fields: {
		  meetingId: meeting.id.toString(),
		  topic:     meeting.topic,
		  startTime: meeting.start_time,
		  duration:  meeting.duration,
		  joinUrl:   meeting.join_url
		}
	  }
	])

	return NextResponse.json({ meeting })
  } catch (err: any) {
	console.error('zoom/meetings error:', err)
	return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
