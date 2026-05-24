import { readFileSync, existsSync } from 'fs'

const PROJECT_REF = 'rvbdiidwslkbeoyczdvr'

// Read from .env.local
const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const envVars = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
    .filter(([k, v]) => k && v)
)

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY

async function runSQL(sql) {
  // Use the Supabase pg endpoint (PostgREST doesn't do raw SQL,
  // but the /pg/query endpoint on the pooler does)
  // Actually use the management API
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

let total = 0
for (let i = 0; i < 25; i++) {
  const path = `/tmp/seed_sm_${i}.sql`
  if (!existsSync(path)) break
  const sql = readFileSync(path, 'utf8')
  const rows = (sql.match(/\(/g) || []).length - 1 // rough count
  try {
    await runSQL(sql)
    total += rows
    console.log(`Batch ${i}: ~${rows} rows inserted (total: ~${total})`)
  } catch (e) {
    console.error(`Batch ${i} failed: ${e.message}`)
    process.exit(1)
  }
}

console.log(`Done. ~${total} rows inserted total.`)
