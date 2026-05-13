import { cookies } from 'next/headers'

// Returns the UTC timestamp for the start of "today" in the user's local timezone.
// getTimezoneOffset() returns offset = UTC - local in minutes (e.g. 420 for UTC-7).
// We shift UTC "now" into local coordinates, zero to local midnight, then shift back.
export async function getTodayStart(): Promise<Date> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('tz_offset')?.value
  const offsetMinutes = raw !== undefined ? parseInt(raw) : 0
  // Shift to local time coordinates
  const localMs = Date.now() - offsetMinutes * 60 * 1000
  const d = new Date(localMs)
  d.setUTCHours(0, 0, 0, 0)
  // Shift back to UTC
  d.setTime(d.getTime() + offsetMinutes * 60 * 1000)
  return d
}
