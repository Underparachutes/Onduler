// One-off seed: ~1 year of realistic logs for ondulertest@gmail.com.
// Outputs SQL to stdout. Run via: node scripts/seed-ondulertest-year.mjs | pbcopy
// then paste into Supabase SQL editor, or pipe through the MCP.

const USER_ID = '5cece65f-e298-4785-8d4a-4de8b5a50a8b'
const CHAPTER_ID = 'a18bcd5d-e2b8-4b57-90db-d4286f072881'

const WINDOW_START = '2025-06-01'
const WINDOW_END = '2026-05-14' // stop before existing logs

// Wave weeks — full weeks of reduced activity (Sunday starts)
const WAVE_WEEK_STARTS = new Set([
  '2025-07-20', // summer slump
  '2025-10-05', // fall wave
  '2025-10-12',
  '2025-12-28', // holiday recovery
  '2026-02-15', // winter wave
  '2026-04-05', // spring wave
])

// Motions with daily probabilities tuned for realistic patterns
const MOTIONS = [
  { id: '66c9506a-e35f-4c09-beda-f748562024da', name: 'Move my body',       pts: 3, hrs: 1.0, p: 0.75 },
  { id: 'c4578812-94f4-471e-97d8-f44c93d71482', name: 'Stretch',            pts: 1, hrs: 1.0, p: 0.60 },
  { id: '2a9861f9-ad62-42e6-9bc4-4aea2bb00d5e', name: 'Meditate',           pts: 2, hrs: 1.0, p: 0.55 },
  { id: 'a9a980cf-d5f4-43e2-90fb-5a1f4311a532', name: 'Read',               pts: 2, hrs: 1.0, p: 0.50 },
  { id: '899b3548-fb01-4304-83e5-0cdc0dc79462', name: 'Spend time outside', pts: 2, hrs: 1.0, p: 0.65 },
  { id: '05f9ab3d-7326-448d-9e04-f3f73a5e738e', name: 'Sleep well',         pts: 1, hrs: 1.0, p: 0.85 },
]

// Wave weeks: only sleep well and occasional outside
const WAVE_PROB = {
  'Sleep well': 0.70,
  'Spend time outside': 0.15,
}

// Seasonal variation — boost/dampen certain motions by month
function seasonalAdjust(motionName, month) {
  // month 0=Jan ... 11=Dec
  if (motionName === 'Move my body') {
    // more active in summer, less in winter
    if (month >= 5 && month <= 8) return 1.15
    if (month === 11 || month === 0 || month === 1) return 0.80
  }
  if (motionName === 'Spend time outside') {
    if (month >= 5 && month <= 8) return 1.20
    if (month >= 10 || month <= 1) return 0.70
  }
  if (motionName === 'Read') {
    // more reading in fall/winter
    if (month >= 9 && month <= 1) return 1.25
    if (month >= 5 && month <= 7) return 0.80
  }
  if (motionName === 'Meditate') {
    // gradual improvement over the year (building habit)
    return 0.85 + (month / 11) * 0.30
  }
  return 1.0
}

// Mulberry32 PRNG
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = rng(0xDEADBEEF)

function pad(n) { return String(n).padStart(2, '0') }

function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function weekStartKey(d) {
  const local = new Date(d)
  const dow = local.getDay()
  local.setDate(local.getDate() - dow)
  return ymd(local)
}

function randomTimestamp(day, r) {
  const hour = 6 + Math.floor(r() * 17) // 6am – 10pm
  const minute = Math.floor(r() * 60)
  const second = Math.floor(r() * 60)
  const ms = Math.floor(r() * 1000)
  return `${ymd(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}.${String(ms).padStart(3, '0')}+00`
}

const rows = []
const [sy, sm, sd] = WINDOW_START.split('-').map(Number)
const day = new Date(sy, sm - 1, sd)

while (ymd(day) < WINDOW_END) {
  const isWave = WAVE_WEEK_STARTS.has(weekStartKey(day))
  const month = day.getMonth()

  for (const motion of MOTIONS) {
    let p
    if (isWave) {
      p = WAVE_PROB[motion.name] ?? 0
    } else {
      p = motion.p * seasonalAdjust(motion.name, month)
      p = Math.min(p, 0.98)
    }

    if (rand() >= p) continue

    rows.push({
      motion_id: motion.id,
      pts: motion.pts,
      hrs: motion.hrs,
      ts: randomTimestamp(day, rand),
    })
  }

  day.setDate(day.getDate() + 1)
}

// Also backdate the chapter
const preamble = `-- Backdate chapter to cover the seed window
UPDATE chapters
SET started_at = '${WINDOW_START} 00:00:00+00'
WHERE id = '${CHAPTER_ID}';

`

// Batch inserts
const BATCH_SIZE = 200
const batches = []
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const slice = rows.slice(i, i + BATCH_SIZE)
  const valuesSql = slice
    .map(r => `('${USER_ID}','${r.motion_id}',${r.pts},${r.hrs.toFixed(2)},'${r.ts}','${CHAPTER_ID}')`)
    .join(',\n  ')
  batches.push(`INSERT INTO logs (user_id, motion_id, points, hours, logged_at, chapter_id) VALUES
  ${valuesSql};`)
}

process.stderr.write(`Generated ${rows.length} log rows across ~${Math.round((new Date(WINDOW_END) - new Date(WINDOW_START)) / 86400000 / 7)} weeks\n`)

// Count per motion
const counts = {}
for (const r of rows) {
  const m = MOTIONS.find(m => m.id === r.motion_id)
  counts[m.name] = (counts[m.name] ?? 0) + 1
}
process.stderr.write(`Per-motion counts:\n`)
for (const [name, count] of Object.entries(counts).sort((a,b) => b[1] - a[1])) {
  process.stderr.write(`  ${name}: ${count}\n`)
}

process.stdout.write(preamble + batches.join('\n\n'))
