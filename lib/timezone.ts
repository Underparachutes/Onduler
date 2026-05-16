function getPacificOffset(): { dateStr: string; offsetMs: number } {
  const now = new Date()
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(now)
  const utcMs = now.getTime()
  const pacificMs = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
  ).getTime()
  return { dateStr, offsetMs: utcMs - pacificMs }
}

function pacificMidnight(year: number, month: number, day: number, offsetMs: number): Date {
  return new Date(Date.UTC(year, month - 1, day) + offsetMs)
}

export async function getTodayStart(): Promise<Date> {
  const { dateStr, offsetMs } = getPacificOffset()
  const [year, month, day] = dateStr.split('-').map(Number)
  return pacificMidnight(year, month, day, offsetMs)
}

// Monday 00:00 Pacific of the current week (Mon–Sun cycle)
export async function getWeekStart(): Promise<Date> {
  const { dateStr, offsetMs } = getPacificOffset()
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const jsDay = date.getDay() // 0=Sun, 1=Mon...6=Sat
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1
  date.setDate(date.getDate() - daysSinceMonday)
  return pacificMidnight(date.getFullYear(), date.getMonth() + 1, date.getDate(), offsetMs)
}

// Monday 00:00 Pacific of the previous week
export async function getLastWeekStart(): Promise<Date> {
  const { dateStr, offsetMs } = getPacificOffset()
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const jsDay = date.getDay()
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1
  date.setDate(date.getDate() - daysSinceMonday - 7)
  return pacificMidnight(date.getFullYear(), date.getMonth() + 1, date.getDate(), offsetMs)
}
