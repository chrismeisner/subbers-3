import base from './airtable'
import { cookies } from 'next/headers'

export interface ZoomClient {
  get(path: string): Promise<any>
  post(path: string, body: any): Promise<any>
}

export async function getZoomClient(): Promise<ZoomClient> {
  // 1) Read userEmail from HttpOnly cookie
  const cookieStore = cookies()
  const userEmail = cookieStore.get('userEmail')?.value
  if (!userEmail) {
	throw new Error('Not authenticated')
  }

  // 2) Lookup the Airtable user record to get Zoom tokens
  const records = await base('users')
	.select({
	  filterByFormula: `{email} = "${userEmail}"`,
	  maxRecords: 1,
	})
	.firstPage()

  if (records.length === 0) {
	throw new Error('User record not found')
  }

  const userRec = records[0]
  const fields = userRec.fields as any
  let accessToken: string | undefined = fields.zoomAccessToken
  let refreshToken: string | undefined = fields.zoomRefreshToken
  let expiresAt: string | undefined = fields.zoomTokenExpires

  if (!accessToken || !refreshToken || !expiresAt) {
	throw new Error('Zoom not connected')
  }

  // 3) Refresh if expired
  if (new Date(expiresAt).getTime() < Date.now()) {
	const authHeader = Buffer.from(
	  `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
	).toString('base64')
	const tokenUrl =
	  `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${encodeURIComponent(
		refreshToken
	  )}`
	const res = await fetch(tokenUrl, {
	  method: 'POST',
	  headers: { Authorization: `Basic ${authHeader}` },
	})
	if (!res.ok) {
	  throw new Error('Failed to refresh Zoom token')
	}
	const data = await res.json()
	accessToken = data.access_token
	refreshToken = data.refresh_token
	expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

	// Persist refreshed tokens back to Airtable
	await base('users').update([
	  {
		id: userRec.id,
		fields: {
		  zoomAccessToken: accessToken,
		  zoomRefreshToken: refreshToken,
		  zoomTokenExpires: expiresAt,
		},
	  },
	])
  }

  // 4) Return simple fetch-based wrapper
  return {
	get: async (path: string) => {
	  const resp = await fetch(`https://api.zoom.us/v2${path}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	  })
	  if (!resp.ok) {
		throw new Error(`Zoom GET ${path} failed: ${resp.status}`)
	  }
	  return resp.json()
	},

	post: async (path: string, body: any) => {
	  const resp = await fetch(`https://api.zoom.us/v2${path}`, {
		method: 'POST',
		headers: {
		  Authorization: `Bearer ${accessToken}`,
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	  })
	  if (!resp.ok) {
		throw new Error(`Zoom POST ${path} failed: ${resp.status}`)
	  }
	  return resp.json()
	},
  }
}
