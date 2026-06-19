// The Onduler export/backup format (v3).
//
// E2EE-aware: the file is assembled CLIENT-side with content decrypted, so the
// user holds a readable, restorable backup even though the database stores
// ciphertext. v2 added `anchors` (the journal). v3 covers ALL chapters, not
// just the active one — a `chapters` array plus a `chapter_id` on every
// chapter-scoped entity — so a restore rebuilds the user's full history.
//
// Restore reads this back, re-encrypts, and remaps ids. Ids here (entities and
// chapters) are the export's OWN ids; restore treats them only as internal join
// keys — new rows get new ids.

export type ExportChapter = {
  id: string
  started_at: string
  ended_at: string | null // null = the active chapter
  sort_order: number
}

export type ExportSwell = {
  id: string
  chapter_id: string
  name: string
  color: string
  target_points: number | null
  target_hours: number | null
  group_id: string | null
  sort_order: number
  created_at: string
}

export type ExportBucket = {
  id: string
  chapter_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export type ExportMotion = {
  id: string
  chapter_id: string
  name: string
  default_points: number
  default_hours: number
  group_id: string | null
  hidden: boolean
  parent_id: string | null
  sort_order: number
  created_at: string
  swells: { swell_id: string; weight: number }[]
}

export type ExportLog = {
  id: string
  chapter_id: string
  logged_at: string
  motion_id: string | null
  motion_name: string | null
  points: number
  hours: number
  intensity: string | null
}

export type ExportWaypoint = {
  id: string
  swell_id: string | null
  motion_id: string | null
  name: string
  kind: string
  cadence: string | null
  target_count: number | null
  completed_at: string | null
  bonus_points: number | null
  sort_order: number
  created_at: string
}

export type ExportWave = {
  id: string
  chapter_id: string
  energy: number
  alignment: number
  duration_seconds: number | null
  checked_in_at: string
}

export type ExportAnchor = {
  id: string
  chapter_id: string
  cycle_type: string
  cycle_start: string | null
  cycle_end: string | null
  expectation_text: string | null
  observation_text: string | null
  intention_text: string | null
  did_tune: boolean | null
  body_text: string | null
  prompt_text: string | null
  created_at: string
}

export type ExportPayload = {
  version: 3
  exported_at: string
  user_email: string | null
  chapters: ExportChapter[]
  swells: ExportSwell[]
  buckets: ExportBucket[]
  motions: ExportMotion[]
  logs: ExportLog[]
  waypoints: ExportWaypoint[]
  waves: ExportWave[]
  anchors: ExportAnchor[]
}

// Raw (still-ciphertext) rows as fetched by getExportData, before the client
// decrypts and assembles. Lives here so the pure assembler (lib/export-build)
// can import the shape without pulling in the 'use server' action module.
export type RawExport = {
  user_email: string | null
  chapters: { id: string; started_at: string; ended_at: string | null; sort_order: number }[]
  swells: { id: string; chapter_id: string; name: string; color: string; target_points: number | null; target_hours: number | null; group_id: string | null; sort_order: number; created_at: string }[]
  groups: { id: string; chapter_id: string; name: string; color: string; sort_order: number; created_at: string }[]
  motions: { id: string; chapter_id: string; name: string; default_points: number; default_hours: number; group_id: string | null; hidden: boolean; parent_id: string | null; sort_order: number; created_at: string }[]
  motionSwells: { motion_id: string; swell_id: string; contribution_weight: number }[]
  logs: { id: string; chapter_id: string; motion_id: string | null; points: number; hours: number; intensity: string | null; logged_at: string; motions: { name: string } | { name: string }[] | null }[]
  milestones: { id: string; swell_id: string | null; motion_id: string | null; name: string; kind: string; cadence: string | null; target_count: number | null; completed_at: string | null; bonus_points: number | null; sort_order: number; created_at: string }[]
  waves: { id: string; chapter_id: string; energy: number; alignment: number; duration_seconds: number | null; checked_in_at: string }[]
  reflections: { id: string; chapter_id: string; cycle_type: string; cycle_start: string | null; cycle_end: string | null; expectation_text: string | null; observation_text: string | null; intention_text: string | null; did_tune: boolean | null; body_text: string | null; prompt_text: string | null; created_at: string }[]
}

// The content fields the export decrypts on the way out / re-encrypts on the
// way back in. Everything else is operational and stays as-is.
export const EXPORT_ENCRYPTED = {
  swellName: true,
  bucketName: true,
  motionName: true,
  logMotionName: true,
  waypointName: true,
  anchorTexts: ['expectation_text', 'observation_text', 'intention_text', 'body_text', 'prompt_text'] as const,
} as const
