// File: app/components/CreateEvent.tsx

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RRule, Frequency, Weekday } from 'rrule'
import UserTimeZone from './UserTimeZone'
import { toUtcIso, formatInTZ } from '@/utils/dateUtils'

export default function CreateEvent() {
  const router = useRouter()

  // helper to build local ISO strings
  const pad = (n: number) => n.toString().padStart(2, '0')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // User’s stored time zone (fallback to browser detection)
  const [timeZone, setTimeZone] = useState<string>('UTC')
  useEffect(() => {
	async function loadUserTimeZone() {
	  try {
		const res = await fetch('/api/users/timezone')
		if (!res.ok) throw new Error('Failed to load time zone')
		const { timeZone: tz } = await res.json()
		setTimeZone(tz)
	  } catch {
		setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
	  }
	}
	loadUserTimeZone()
  }, [])

  // One-time event: separate date & time
  const [oneTimeDate, setOneTimeDate] = useState('')       // "YYYY-MM-DD"
  const [oneTimeTime, setOneTimeTime] = useState('12:00')  // "HH:mm"

  // Combined ISO datetime for submission or first occurrence (local "YYYY-MM-DDTHH:mm")
  const [eventDate, setEventDate] = useState('')

  const [isRecurring, setIsRecurring] = useState(false)
  const [freq, setFreq] = useState<Frequency>(RRule.WEEKLY)
  const [interval, setInterval] = useState<number>(1)

  // Weekly options
  const [byWeekDays, setByWeekDays] = useState<Weekday[]>([])

  // Monthly options
  const [monthlyMode, setMonthlyMode] = useState<'date' | 'day'>('date')
  const [monthlyDay, setMonthlyDay] = useState<number>(1)
  const [monthlyOrdinal, setMonthlyOrdinal] = useState<number>(1)
  const [monthlyWeekday, setMonthlyWeekday] = useState<Weekday>(RRule.MO)

  // Time-of-day for recurring
  const [timeOfDay, setTimeOfDay] = useState('12:00')

  // End criteria
  const [endMode, setEndMode] = useState<'never' | 'count' | 'until'>('never')
  const [count, setCount] = useState<number>(1)
  const [until, setUntil] = useState('')                   // "YYYY-MM-DD"

  // Computed RRULE and next occurrences
  const [recurrenceRule, setRecurrenceRule] = useState<string>('')
  const [nextTimes, setNextTimes] = useState<Date[]>([])

  // Ticket price as currency input (USD)
  const [ticketPrice, setTicketPrice] = useState<number>(0.0)

  // Form status
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Weekday labels
  const weekdays: { label: string; value: Weekday }[] = [
	{ label: 'Sun', value: RRule.SU },
	{ label: 'Mon', value: RRule.MO },
	{ label: 'Tue', value: RRule.TU },
	{ label: 'Wed', value: RRule.WE },
	{ label: 'Thu', value: RRule.TH },
	{ label: 'Fri', value: RRule.FR },
	{ label: 'Sat', value: RRule.SA },
  ]

  function toggleWeekday(day: Weekday) {
	setByWeekDays(prev =>
	  prev.some(d => d.weekday === day.weekday)
		? prev.filter(d => d.weekday !== day.weekday)
		: [...prev, day]
	)
  }

  // Compute RRULE & nextTimes anchored at true first occurrence
  useEffect(() => {
	if (!isRecurring) {
	  setRecurrenceRule('')
	  setNextTimes([])
	  return
	}

	const [h, m] = timeOfDay.split(':').map(Number)
	const now = new Date()
	let localDt = new Date(
	  now.getFullYear(),
	  now.getMonth(),
	  now.getDate(),
	  h,
	  m,
	  0
	)
	if (freq === RRule.MONTHLY && monthlyMode === 'date') {
	  localDt.setDate(monthlyDay)
	}
	const seedLocal = `${localDt.getFullYear()}-${pad(localDt.getMonth()+1)}-${pad(localDt.getDate())}T${pad(localDt.getHours())}:${pad(localDt.getMinutes())}`
	const seed = new Date(toUtcIso(seedLocal))

	const opts: any = { freq, interval, dtstart: seed, tzid: timeZone }
	if (freq === RRule.WEEKLY && byWeekDays.length) opts.byweekday = byWeekDays
	if (freq === RRule.MONTHLY && monthlyMode === 'day')
	  opts.byweekday = [monthlyWeekday.nth(monthlyOrdinal)]
	if (endMode === 'count') opts.count = count
	else if (endMode === 'until' && until) opts.until = new Date(until)

	const rule = new RRule(opts)
	const occurrences = rule.all((_, i) => i < 5)

	if (occurrences.length) {
	  const first = occurrences[0]
	  const finalOpts = { ...opts, dtstart: first }
	  setRecurrenceRule(new RRule(finalOpts).toString())
	  setNextTimes(occurrences)

	  const YYYY = first.getFullYear()
	  const MM = pad(first.getMonth() + 1)
	  const DD = pad(first.getDate())
	  const hh = pad(first.getHours())
	  const mm = pad(first.getMinutes())
	  setEventDate(`${YYYY}-${MM}-${DD}T${hh}:${mm}`)
	} else {
	  setRecurrenceRule('')
	  setNextTimes([])
	  setEventDate('')
	}
  }, [
	isRecurring,
	freq,
	interval,
	byWeekDays,
	timeOfDay,
	monthlyMode,
	monthlyDay,
	monthlyOrdinal,
	monthlyWeekday,
	endMode,
	count,
	until,
	timeZone,
  ])

  // Combine one-time inputs
  useEffect(() => {
	if (!isRecurring && oneTimeDate && oneTimeTime) {
	  setEventDate(`${oneTimeDate}T${oneTimeTime}`)
	}
  }, [oneTimeDate, oneTimeTime, isRecurring])

  async function handleSubmit(e: React.FormEvent) {
	e.preventDefault()
	setLoading(true)
	setError(null)

	if (ticketPrice < 0.5) {
	  setError('Ticket price must be at least $0.50')
	  setLoading(false)
	  return
	}

	const submissionEventDate = toUtcIso(eventDate)

	let recurrenceInterval = ''
	if (isRecurring && eventDate) {
	  const dtstart = new Date(toUtcIso(eventDate))
	  const opts: any = { freq, interval, dtstart, tzid: timeZone }
	  if (freq === RRule.WEEKLY && byWeekDays.length) opts.byweekday = byWeekDays
	  if (freq === RRule.MONTHLY && monthlyMode === 'date') opts.bymonthday = monthlyDay
	  if (freq === RRule.MONTHLY && monthlyMode === 'day')
		opts.byweekday = [monthlyWeekday.nth(monthlyOrdinal)]
	  if (endMode === 'count') opts.count = count
	  else if (endMode === 'until' && until) opts.until = new Date(until)
	  recurrenceInterval = new RRule(opts).toString()
	}

	const payload = {
	  name,
	  description,
	  eventDate: submissionEventDate,
	  isRecurring,
	  recurrenceInterval,
	  ticketPrice,
	  eventTimeZone: timeZone,
	}

	try {
	  const res = await fetch('/api/events', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ event: payload }),
	  })
	  const body = await res.json()
	  if (!res.ok) throw new Error(body.error || `API ${res.status}`)

	  const newId = body.data.id || body.data.eventId || body.data.recordId
	  router.push(`/create-event/success?id=${newId}`)
	} catch (err: any) {
	  setError(err.message)
	} finally {
	  setLoading(false)
	}
  }

  return (
	<>
	  <UserTimeZone />

	  <form onSubmit={handleSubmit} className="space-y-6 p-4 border rounded bg-white">
		{error && <p className="text-red-600">{error}</p>}

		{/* Event Name */}
		<div>
		  <label htmlFor="name" className="block font-medium">Event Name</label>
		  <input
			id="name"
			type="text"
			required
			value={name}
			onChange={e => setName(e.target.value)}
			className="mt-1 block w-full border p-2 rounded"
		  />
		</div>

		{/* Description */}
		<div>
		  <label htmlFor="description" className="block font-medium">Description</label>
		  <textarea
			id="description"
			value={description}
			onChange={e => setDescription(e.target.value)}
			className="mt-1 block w-full border p-2 rounded"
		  />
		</div>

		{/* Event Type */}
		<div className="space-y-1">
		  <p className="block font-medium">Event Type</p>
		  <div className="flex space-x-4">
			<label
			  htmlFor="oneTime"
			  className={`flex-1 p-4 border rounded cursor-pointer ${!isRecurring ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
			>
			  <input
				id="oneTime"
				type="radio"
				name="eventType"
				checked={!isRecurring}
				onChange={() => setIsRecurring(false)}
			  />
			  <div>
				<p className="font-medium">One Time Event</p>
				<p className="text-sm text-gray-600">A single event</p>
			  </div>
			</label>
			<label
			  htmlFor="recurring"
			  className={`flex-1 p-4 border rounded cursor-pointer ${isRecurring ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
			>
			  <input
				id="recurring"
				type="radio"
				name="eventType"
				checked={isRecurring}
				onChange={() => setIsRecurring(true)}
			  />
			  <div>
				<p className="font-medium">Recurring Event</p>
				<p className="text-sm text-gray-600">Repeats on a schedule</p>
			  </div>
			</label>
		  </div>
		</div>

		{/* One-time inputs */}
		{!isRecurring && (
		  <div className="grid grid-cols-2 gap-4">
			<div>
			  <label htmlFor="oneTimeDate" className="block font-medium">
				Event Date <span className="text-sm text-gray-500">({timeZone})</span>
			  </label>
			  <input
				id="oneTimeDate"
				type="date"
				required
				value={oneTimeDate}
				onChange={e => setOneTimeDate(e.target.value)}
				className="mt-1 block w-full border p-2 rounded"
			  />
			</div>
			<div>
			  <label htmlFor="oneTimeTime" className="block font-medium">
				Event Time <span className="text-sm text-gray-500">({timeZone})</span>
			  </label>
			  <input
				id="oneTimeTime"
				type="time"
				required
				value={oneTimeTime}
				onChange={e => setOneTimeTime(e.target.value)}
				className="mt-1 block w-full border p-2 rounded"
			  />
			</div>
		  </div>
		)}

		{/* Recurrence options */}
		{isRecurring && (
		  <>
			<div>
			  <label htmlFor="freq" className="block font-medium">Repeat</label>
			  <select
				id="freq"
				value={freq}
				onChange={e => setFreq(Number(e.target.value))}
				className="mt-1 block w-full border p-2 rounded"
			  >
				<option value={RRule.DAILY}>Daily</option>
				<option value={RRule.WEEKLY}>Weekly</option>
				<option value={RRule.MONTHLY}>Monthly</option>
			  </select>
			</div>

			{freq === RRule.MONTHLY && (
			  <div className="space-y-4">
				<label className="block font-medium">Monthly On</label>
				<select
				  value={monthlyMode}
				  onChange={e => setMonthlyMode(e.target.value as any)}
				  className="mt-1 block w-full border p-2 rounded"
				>
				  <option value="date">Same date every month</option>
				  <option value="day">Same weekday every month</option>
				</select>
				{monthlyMode === 'date' ? (
				  <div>
					<label htmlFor="monthlyDay" className="block font-medium">Day of Month</label>
					<input
					  id="monthlyDay"
					  type="number"
					  min={1}
					  max={31}
					  value={monthlyDay}
					  onChange={e => setMonthlyDay(parseInt(e.target.value, 10) || 1)}
					  className="mt-1 block w-20 border p-2 rounded"
					/>
				  </div>
				) : (
				  <div className="space-y-2">
					<div>
					  <label htmlFor="monthlyOrdinal" className="block font-medium">Which</label>
					  <select
						id="monthlyOrdinal"
						value={monthlyOrdinal}
						onChange={e => setMonthlyOrdinal(parseInt(e.target.value, 10))}
						className="mt-1 block w-full border p-2 rounded"
					  >
						<option value={1}>First</option>
						<option value={2}>Second</option>
						<option value={3}>Third</option>
						<option value={4}>Fourth</option>
						<option value={-1}>Last</option>
					  </select>
					</div>
					<div>
					  <label htmlFor="monthlyWeekday" className="block font-medium">Weekday</label>
					  <select
						id="monthlyWeekday"
						value={monthlyWeekday.weekday}
						onChange={e =>
						  setMonthlyWeekday(
							weekdays.find(d => d.value.weekday === parseInt(e.target.value, 10))!.value
						  )
						}
						className="mt-1 block w-full border p-2 rounded"
					  >
						{weekdays.map(wd => (
						  <option key={wd.value.weekday} value={wd.value.weekday}>
							{wd.label}
						  </option>
						))}
					  </select>
					</div>
				  </div>
				)}
			  </div>
			)}

			{freq === RRule.WEEKLY && (
			  <div className="flex items-center space-x-2">
				<label className="font-medium">Every</label>
				<select
				  value={interval}
				  onChange={e => setInterval(parseInt(e.target.value, 10))}
				  className="border p-2 rounded"
				>
				  <option value={1}>Every week</option>
				  <option value={2}>Every other week</option>
				</select>
			  </div>
			)}

			{freq === RRule.WEEKLY && (
			  <div>
				<label className="block font-medium">On</label>
				<div className="flex space-x-1 mt-1">
				  {weekdays.map(wd => (
					<button
					  key={wd.value.weekday}
					  type="button"
					  onClick={() => toggleWeekday(wd.value)}
					  className={`px-2 py-1 rounded ${byWeekDays.some(d => d.weekday === wd.value.weekday) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
					>
					  {wd.label}
					</button>
				  ))}
				</div>
			  </div>
			)}

			<div>
			  <label htmlFor="timeOfDay" className="block font-medium">
				Time of Day <span className="text-sm text-gray-500">({timeZone})</span>
			  </label>
			  <input
				id="timeOfDay"
				type="time"
				value={timeOfDay}
				onChange={e => setTimeOfDay(e.target.value)}
				className="mt-1 block w-full border p-2 rounded"
			  />
			</div>

			<div>
			  <label htmlFor="firstEvent" className="block font-medium">First Event Time</label>
			  <select
				id="firstEvent"
				value={eventDate}
				onChange={e => setEventDate(e.target.value)}
				className="mt-1 block w-full border p-2 rounded"
			  >
				{nextTimes.map(dt => {
				  const YYYY = dt.getFullYear()
				  const MM = pad(dt.getMonth() + 1)
				  const DD = pad(dt.getDate())
				  const hh = pad(dt.getHours())
				  const mm = pad(dt.getMinutes())
				  const localIso = `${YYYY}-${MM}-${DD}T${hh}:${mm}`
				  return (
					<option key={localIso} value={localIso}>
					  {formatInTZ(dt.toISOString(), timeZone)}
					</option>
				  )
				})}
			  </select>
			</div>

			<div>
			  <label className="block font-medium">End</label>
			  <select
				value={endMode}
				onChange={e => setEndMode(e.target.value as any)}
				className="mt-1 block w-full border p-2 rounded"
			  >
				<option value="never">No end date</option>
				<option value="count">End after...</option>
				<option value="until">End on date</option>
			  </select>
			  {endMode === 'count' && (
				<div className="mt-2 flex items-center space-x-2">
				  <input
					type="number"
					min={1}
					value={count}
					onChange={e => setCount(parseInt(e.target.value, 10) || 1)}
					className="w-20 border p-2 rounded"
				  />
				  <span>occurrence(s)</span>
				</div>
			  )}
			  {endMode === 'until' && (
				<input
				  type="date"
				  value={until}
				  onChange={e => setUntil(e.target.value)}
				  className="mt-2 block w-full border p-2 rounded"
				/>
			  )}
			</div>

			{recurrenceRule && <p className="text-sm text-gray-500">Rule: {recurrenceRule}</p>}
		  </>
		)}

		{/* Ticket Price */}
		<div>
		  <label htmlFor="ticketPrice" className="block font-medium">
			Ticket Price (USD, min $0.50)
		  </label>
		  <input
			id="ticketPrice"
			type="number"
			step="0.01"
			min="0.50"
			required
			value={ticketPrice}
			onChange={e => setTicketPrice(parseFloat(e.target.value) || 0)}
			className="mt-1 block w-full border p-2 rounded"
		  />
		</div>

		{/* Submit */}
		<button
		  type="submit"
		  disabled={loading}
		  className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
		>
		  {loading ? 'Creating…' : 'Create Event'}
		</button>
	  </form>
	</>
  )
}
