// File: lib/getZoomClient.ts

import axios, { AxiosInstance } from 'axios'
import base from './airtable'
import { cookies } from 'next/headers'

/**
 * Creates and returns an Axios instance configured with the
 * authenticated user's Zoom access token, refreshing it if needed.
 */
export async function getZoomClient(): Promise<AxiosInstance> {
  // 1) Read the logged-in user's email from our HttpOnly cookie
  const cookieStore = await cookies()
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
  const accessToken: string | undefined = fields.zoomAccessToken
  const refreshToken: string | undefined = fields.zoomRefreshToken
  const expiresAt: string | undefined = fields.zoomTokenExpires

  if (!accessToken || !refreshToken || !expiresAt) {
	throw new Error('Zoom not connected')
  }

  let tokenToUse = accessToken
  let newRefreshToken = refreshToken
  let newExpiresAt = expiresAt

  // 3) If the access token has expired, refresh it
  if (new Date(expiresAt).getTime() < Date.now()) {
	const params = new URLSearchParams({
	  grant_type: 'refresh_token',
	  refresh_token: refreshToken,
	})
	const resp = await axios.post(
	  `https://zoom.us/oauth/token?${params.toString()}`,
	  null,
	  {
		auth: {
		  username: process.env.ZOOM_CLIENT_ID!,
		  password: process.env.ZOOM_CLIENT_SECRET!,
		},
	  }
	)
	const data = resp.data
	tokenToUse = data.access_token
	newRefreshToken = data.refresh_token
	// expires_in is in seconds
	newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

	// Persist the refreshed tokens back to Airtable
	await base('users').update([
	  {
		id: userRec.id,
		fields: {
		  zoomAccessToken: tokenToUse,
		  zoomRefreshToken: newRefreshToken,
		  zoomTokenExpires: newExpiresAt,
		},
	  },
	])
  }

  // 4) Return an Axios instance pre-configured for Zoom API calls
  return axios.create({
	baseURL: 'https://api.zoom.us/v2',
	headers: {
	  Authorization: `Bearer ${tokenToUse}`,
	},
  })
}
