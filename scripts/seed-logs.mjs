// One-off seed for ~12 weeks of realistic logs against Josh's Onduler account.
// Outputs a single SQL INSERT to stdout. Designed to be piped to the Supabase
// SQL runner (or executed via the Supabase MCP). RETURNING id lets the caller
// capture inserted IDs to scripts/.seed-logs.json for trivial cleanup.
//
// Re-running this script regenerates the same SQL deterministically (seeded
// PRNG). To re-seed, run cleanup first to avoid duplicates.

const USER_ID = '86f20c8d-0a02-4f4c-8834-743c368e6f46'

// Sunday-anchored window. Seed covers [WINDOW_START_DATE, WINDOW_END_DATE).
// End is exclusive, so the user's same-day real logs are never touched.
// Compared as YYYY-MM-DD strings to stay agnostic to DST and runtime TZ.
const WINDOW_START_DATE = '2026-02-22'
const WINDOW_END_DATE = '2026-05-18'

// Wave-week Sundays (full weeks of reduced activity). Keyed by YYYY-MM-DD
// to stay timezone-agnostic.
const WAVE_WEEK_STARTS = new Set(['2026-03-22', '2026-04-19'])

// Motion config — id, points, daily probability in a normal week.
// `weekdaysOnly` skips Sat/Sun. `perDay` (when set) draws an integer count
// from [perDay.min, perDay.max] of logs to fire on a hit day, overriding
// the single-fire default. Tuned so weekly aggregates against the user's
// targets land at: Movement ~80% · Mind ~60% · Connection ~30% ·
// Work ~85% · Creativity ~55% · Adventure ~5% (pinch).
const MOTIONS = [
  { id: 'cf49d366-407e-461b-9c02-5897528736a4', name: 'Move',     pts: 12, p: 0.92 },
  { id: 'c0a1178a-9389-49fc-b1cb-ca90aa45f59c', name: 'Reduce',   pts: 4,  p: 0.65 },
  { id: '6e022f47-5912-4a54-b9b0-9e86b959960d', name: 'Sleep',    pts: 4,  p: 0.95 },
  { id: '28885e80-00cd-4ad4-9171-a97558860f84', name: 'Think',    pts: 3,  p: 0.50 },
  { id: '357628d3-03af-4a01-a978-c5ebefe90f70', name: 'Meditate', pts: 5,  p: 0.70 },
  { id: '25318e9e-ca97-43f3-804e-90079238e382', name: 'Connect',  pts: 4,  p: 0.65 },
  { id: 'daa610a5-19ad-4243-83b8-b89d094abda0', name: 'Nourish',  pts: 3,  p: 0.55 },
  { id: 'a738dec0-474f-4a6a-a5db-4d97018c723f', name: 'Earn',     pts: 3,  p: 0.98, weekdaysOnly: true, perDay: { min: 4, max: 7 } },
  { id: '4c971c32-ba2e-4496-961b-33d7ce4a8133', name: 'Write',    pts: 8,  p: 0.55 },
  { id: '6be7266b-7dd2-44e9-825f-14be96d85110', name: 'Cook',     pts: 5,  p: 0.70 },
  { id: '05efd516-799b-44dd-980f-70af9456721a', name: 'Make',     pts: 4,  p: 0.35 },
  { id: 'dfdd7963-71ba-4b4a-946c-bc579c4ebe6f', name: 'Practice', pts: 3,  p: 0.12 },
]

// Wave-week overrides — basic-care only.
const WAVE_PROB = {
  'Sleep': 0.85,
  'Nourish': 0.30,
}

// Mulberry32 — small deterministic PRNG so the seed is reproducible.
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

const rand = rng(0x0d121e2)

function weekStartKey(d) {
  const local = new Date(d)
  const dow = local.getDay() // 0 = Sun
  local.setDate(local.getDate() - dow)
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`
}

function pad(n) { return String(n).padStart(2, '0') }

function randomTimestampForDay(day, r) {
  // Spread within waking hours so the timeline reads natural.
  const hour = 7 + Math.floor(r() * 16) // 7am – 10pm
  const minute = Math.floor(r() * 60)
  const second = Math.floor(r() * 60)
  const y = day.getFullYear()
  const m = pad(day.getMonth() + 1)
  const d = pad(day.getDate())
  return `${y}-${m}-${d}T${pad(hour)}:${pad(minute)}:${pad(second)}-08:00`
}

function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const rows = []
const [sy, sm, sd] = WINDOW_START_DATE.split('-').map(Number)
const day = new Date(sy, sm - 1, sd)
while (ymd(day) < WINDOW_END_DATE) {
  const isWave = WAVE_WEEK_STARTS.has(weekStartKey(day))
  const dow = day.getDay()

  for (const motion of MOTIONS) {
    if (motion.weekdaysOnly && (dow === 0 || dow === 6)) continue

    const p = isWave ? (WAVE_PROB[motion.name] ?? 0) : motion.p
    if (rand() >= p) continue

    const count = motion.perDay && !isWave
      ? motion.perDay.min + Math.floor(rand() * (motion.perDay.max - motion.perDay.min + 1))
      : 1
    for (let i = 0; i < count; i++) {
      rows.push({ motion, day: new Date(day), ts: randomTimestampForDay(day, rand) })
    }
  }

  day.setDate(day.getDate() + 1)
}

// Batch so each chunk fits inside the MCP execute_sql parameter envelope.
// Per-row size is ~110 chars; ~250 rows → ~28KB SQL. Three batches for 777 logs.
const BATCH_SIZE = 250
const batches = []
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const slice = rows.slice(i, i + BATCH_SIZE)
  const valuesSql = slice
    .map(r => `('${USER_ID}','${r.motion.id}',${r.motion.pts},1.00,'${r.ts}')`)
    .join(',\n  ')
  batches.push(`WITH inserted AS (
  INSERT INTO logs (user_id, motion_id, points, hours, logged_at) VALUES
  ${valuesSql}
  RETURNING id
)
SELECT json_agg(id) AS ids FROM inserted;`)
}
const sql = batches.join('\n----- BATCH -----\n')

// Quick per-swell-per-week verifier on stderr so we can sanity-check shape
// before sending the SQL to prod. Maps motion name → its (single) swell name.
const MOTION_TO_SWELL = {
  Move: 'Movement', Reduce: 'Movement',
  Sleep: 'Mind', Think: 'Mind', Meditate: 'Mind',
  Connect: 'Connection', Nourish: 'Connection',
  Earn: 'Work',
  Write: 'Creativity', Cook: 'Creativity', Make: 'Creativity',
  Practice: 'Adventure',
}
const TARGETS = { Movement: 150, Mind: 100, Connection: 100, Work: 100, Creativity: 150, Adventure: 100 }
const byWeek = new Map()
for (const r of rows) {
  const ws = weekStartKey(r.day)
  const swell = MOTION_TO_SWELL[r.motion.name]
  if (!byWeek.has(ws)) byWeek.set(ws, {})
  byWeek.get(ws)[swell] = (byWeek.get(ws)[swell] ?? 0) + r.motion.pts
}
const weeks = Array.from(byWeek.keys()).sort()
process.stderr.write(`Generated ${rows.length} log rows across ${weeks.length} weeks\n`)
process.stderr.write(`\nWeekly per-swell coverage (% of target):\n`)
process.stderr.write(`week-start    Move  Mind  Conn  Work  Crea  Adv   wave?\n`)
for (const w of weeks) {
  const d = byWeek.get(w)
  const pct = (n) => String(Math.round(((d[n] ?? 0) / TARGETS[n]) * 100)).padStart(4)
  const wave = WAVE_WEEK_STARTS.has(w) ? '  WAVE' : ''
  process.stderr.write(`${w}  ${pct('Movement')}  ${pct('Mind')}  ${pct('Connection')}  ${pct('Work')}  ${pct('Creativity')}  ${pct('Adventure')}${wave}\n`)
}

process.stdout.write(sql)
