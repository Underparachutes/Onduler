// Returns the UTC timestamp for the start of "today" in Pacific time.
// Handles PST (UTC-8) and PDT (UTC-7) automatically via Intl APIs.
export async function getTodayStart(): Promise<Date> {
  const now = new Date()

  // Get today's date string in Pacific time, e.g. "2026-05-13"
  const pacificDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(now)

  // Find the UTC-to-Pacific offset at this moment by comparing timestamps.
  // toLocaleString gives Pacific wall-clock time as a string; parsing it as
  // a "UTC" date gives us the offset difference.
  const utcMs = now.getTime()
  const pacificMs = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
  ).getTime()
  const offsetMs = utcMs - pacificMs

  // Treat the Pacific date as UTC midnight, then shift by the offset
  // to get the true UTC equivalent of Pacific midnight.
  const [year, month, day] = pacificDateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day) + offsetMs)
}
