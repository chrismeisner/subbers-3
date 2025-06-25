// File: app/dashboard/events/[eventId]/edit/page.tsx

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RRule, Frequency, Weekday } from 'rrule'
import { toUtcIso, formatInTZ } from '@/utils/dateUtils'
import UserTimeZone from '../../../components/UserTimeZone'

export default function EditEventTimePage() {
  const { eventId } = useParams() as { eventId: string }
  const router = useRouter()

  // Helpers
  function pad(n: number) {
	return n.toString().padStart(2, '0')
  }
  function formatLocal(dt: Date) {
	const Y = dt.getFullYear()
	const M = pad(dt.getMonth() + 1)
	const D = pad(dt.getDate())
	const h = pad(dt.getHours())
	const m = pad(dt.getMinutes())
	return `${Y}-${M}-${D}T${h}:${m}`
  }

  // Form state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeZone, setTimeZone] = useState('UTC')
  const [now, setNow] = useState<Date>(new Date())
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('') // "YYYY-MM-DDTHH:mm" local
  const [isRecurring, setIsRecurring] = useState(false)
  const [freq, setFreq] = useState<Frequency>(RRule.WEEKLY)
  const [interval, setInterval] = useState<number>(1)
  const [byWeekDays, setByWeekDays] = useState<Weekday[]>([])
  const [timeOfDay, setTimeOfDay] = useState('12:00') // "HH:mm"
  const [nextTimes, setNextTimes] = useState<Date[]>([])
  const [monthlyMode, setMonthlyMode] = useState<'date' | 'day'>('date')
  const [monthlyDay, setMonthlyDay] = useState<number>(1)
  const [monthlyOrdinal, setMonthlyOrdinal] = useState<number>(1)
  const [monthlyWeekday, setMonthlyWeekday] = useState<Weekday>(RRule.MO)
  const [endMode, setEndMode] = useState<'never' | 'count' | 'until'>('never')
  const [count, setCount] = useState<number>(1)
  const [until, setUntil] = useState('')

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

  // detect user's timezone and start ticking clock
  useEffect(() => {
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
	setTimeZone(tz)
	const id = setInterval(() => setNow(new Date()), 1000)
	return () => clearInterval(id)
  }, [])

  // compute next 5 occurrences _after now_, seeding with today at timeOfDay
  const computeNext = useCallback(() => {
	if (!isRecurring) return

	const [h, m] = timeOfDay.split(':').map(Number)
	const localDt = new Date(now)
	localDt.setHours(h, m, 0, 0)
	if (freq === RRule.MONTHLY && monthlyMode === 'date') {
	  localDt.setDate(monthlyDay)
	}
	const seedLocal = `${localDt.getFullYear()}-${pad(localDt.getMonth()+1)}-${pad(localDt.getDate())}T${pad(localDt.getHours())}:${pad(localDt.getMinutes())}`
	const seed = new Date(toUtcIso(seedLocal))

	const opts: any = {
	  freq,
	  interval,
	  dtstart: seed,
	  tzid: timeZone,
	}
	if (freq === RRule.WEEKLY && byWeekDays.length) opts.byweekday = byWeekDays
	if (freq === RRule.MONTHLY && monthlyMode === 'day')
	  opts.byweekday = [monthlyWeekday.nth(monthlyOrdinal)]
	if (endMode === 'count') opts.count = count
	else if (endMode === 'until' && until) opts.until = new Date(until)

	const rule = new RRule(opts)
	const occ: Date[] = []
	let next = rule.after(now, true)
	if (next) {
	  occ.push(next)
	  for (let i = 1; i < 5; i++) {
		const after = rule.after(occ[i - 1], false)
		if (!after) break
		occ.push(after)
	  }
	}
	setNextTimes(occ)
	if (occ.length) {
	  setEventDate(formatLocal(occ[0]))
	}
  }, [
	now,
	isRecurring,
	timeOfDay,
	freq,
	interval,
	byWeekDays,
	monthlyMode,
	monthlyDay,
	monthlyOrdinal,
	monthlyWeekday,
	endMode,
	count,
	until,
	timeZone,
  ])

  useEffect(() => {
	computeNext()
  }, [computeNext])

  // fetch existing event & prefill
  useEffect(() => {
	async function load() {
	  try {
		const res = await fetch(`/api/events/${eventId}`)
		const body = await res.json()
		if (!res.ok) throw new Error(body.error || `API ${res.status}`)
		const ev = body.data

		setName(ev.name)
		setDescription(ev.description)
		setEventDate(formatLocal(new Date(ev.eventDate)))
		setIsRecurring(ev.isRecurring)

		if (ev.isRecurring && ev.recurrenceInterval) {
		  const rule = RRule.fromString(ev.recurrenceInterval)
		  const opts = rule.options

		  setFreq(opts.freq as Frequency)
		  setInterval(opts.interval || 1)

		  if (opts.byweekday) {
			const days = Array.isArray(opts.byweekday)
			  ? opts.byweekday
			  : [opts.byweekday]
			setByWeekDays(days as Weekday[])
		  }
		  if (opts.bymonthday) {
			setMonthlyMode('date')
			setMonthlyDay(opts.bymonthday as number)
		  }
		  if (opts.byweekday && opts.nth) {
			setMonthlyMode('day')
			setMonthlyOrdinal(opts.nth as number)
			const days = Array.isArray(opts.byweekday)
			  ? opts.byweekday
			  : [opts.byweekday]
			setMonthlyWeekday(days[0] as Weekday)
		  }
		  if (opts.count) {
			setEndMode('count')
			setCount(opts.count)
		  } else if (opts.until) {
			setEndMode('until')
			setUntil(opts.until.toISOString().slice(0, 10))
		  }

		  const dt = opts.dtstart || new Date(ev.eventDate)
		  setTimeOfDay(formatLocal(dt).slice(11))
		  setNextTimes(rule.all((_, i) => i < 5))
		}
	  } catch (e: any) {
		setError(e.message)
	  } finally {
		setLoading(false)
	  }
	}
	load()
  }, [eventId])

  // submit handler
  async function handleSubmit(e: React.FormEvent) {
	e.preventDefault()
	setLoading(true)
	setError(null)

	let newRRULE = ''
	if (isRecurring) {
	  const [datePart] = eventDate.split('T')
	  const [h, m] = timeOfDay.split(':').map(Number)
	  const localStr = `${datePart}T${pad(h)}:${pad(m)}`
	  const dtstart = new Date(toUtcIso(localStr))

	  const opts: any = {
		freq,
		interval,
		dtstart,
		tzid: timeZone,
	  }
	  if (freq === RRule.WEEKLY && byWeekDays.length) opts.byweekday = byWeekDays
	  if (freq === RRule.MONTHLY && monthlyMode === 'date') opts.bymonthday = monthlyDay
	  if (freq === RRule.MONTHLY && monthlyMode === 'day')
		opts.byweekday = [monthlyWeekday.nth(monthlyOrdinal)]
	  if (endMode === 'count') opts.count = count
	  else if (endMode === 'until' && until) opts.until = new Date(until)

	  newRRULE = new RRule(opts).toString()
	}

	// send local ISO converted to UTC for storage
	const payload: any = {
	  name,
	  description,
	  eventDate: toUtcIso(eventDate),
	  eventTimeZone: timeZone,
	}
	if (isRecurring) payload.recurrenceInterval = newRRULE

	try {
	  const res = await fetch(`/api/events/${eventId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	  })
	  const body = await res.json()
	  if (!res.ok) throw new Error(body.error || `API ${res.status}`)
	  router.push(`/dashboard/events/${eventId}`)
	} catch (e: any) {
	  setError(e.message)
	  setLoading(false)
	}
  }

  if (loading) return <p>Loading…</p>
  if (error) return <p className="text-red-600">Error: {error}</p>

  return (
	<>
	  <UserTimeZone />
	  <form
		onSubmit={handleSubmit}
		className="space-y-6 p-4 border rounded bg-white max-w-3xl mx-auto"
	  >
		<h2 className="text-xl font-semibold">Edit Event</h2>

		{/* Current local time */}
		<p className="text-sm text-gray-600">
		  Now: {formatInTZ(now.toISOString(), timeZone)} ({timeZone})
		</p>

		{/* Name */}
		<div>
		  <label htmlFor="name" className="block font-medium">
			Event Name
		  </label>
		  <input
			id="name"
			type="text"
			value={name}
			onChange={e => setName(e.target.value)}
			required
			className="mt-1 block w-full border p-2 rounded"
		  />
		</div>

		{/* Description */}
		<div>
		  <label htmlFor="description" className="block font-medium">
			Description
		  </label>
		  <textarea
			id="description"
			value={description}
			onChange={e => setDescription(e.target.value)}
			className="mt-1 block w-full border p-2 rounded"
		  />
		</div>

		{/* Recurrence */}
		{isRecurring ? (
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
		  </>
		) : (
		  // One-time event
		  <div>
			<label className="block font-medium">
			  Event Date & Time <span className="text-sm text-gray-500">({timeZone})</span>
			</label>
			<input
			  type="datetime-local"
			  required
			  value={eventDate}
			  onChange={e => setEventDate(e.target.value)}
			  className="mt-1 block w-full border p-2 rounded"
			/>
		  </div>
		)}

		{/* Submit */}
		<button
		  type="submit"
		  disabled={loading}
		  className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
		>
		  {loading ? 'Saving…' : 'Save Changes'}
		</button>
	  </form>
	</>
  )
}
