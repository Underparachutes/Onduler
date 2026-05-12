import { cookies } from 'next/headers'

// Returns the UTC timestamp for the start of "today" in the user's local timezone.
// getTimezoneOffset() returns minutes to add to local to get UTC (420 for UTC-7).
// So local midnight in UTC = UTC midnight + offset minutes.
export async function getTodayStart(): Promise<Date> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('tz_offset')?.value
  const offsetMinutes = raw !== undefined ? parseInt(raw) : 0
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setTime(d.getTime() + offsetMinutes * 60 * 1000)
  return d
}
