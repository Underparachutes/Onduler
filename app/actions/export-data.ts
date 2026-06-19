'use server'

import { createClient } from '@/lib/supabase/server'
import type { RawExport } from '@/lib/export-format'

// Fetches raw (still-ciphertext) rows across ALL chapters. The client decrypts
// the content fields and assembles the v3 export payload (lib/export-build) —
// the server never sees plaintext, and post-migration the file is readable only
// because the browser holds the key. Covers every chapter so a restore can
// rebuild the user's full history; junctions and milestones inherit their
// chapter via FK, so they stay chapter-unfiltered.
export async function getExportData(): Promise<RawExport | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const uid = user.id
  const [chapters, swells, groups, motions, motionSwells, logs, milestones, waves, reflections] = await Promise.all([
    supabase.from('chapters').select('id, started_at, ended_at, sort_order').eq('user_id', uid).order('sort_order'),
    supabase.from('swells').select('id, chapter_id, name, color, target_points, target_hours, group_id, sort_order, created_at').eq('user_id', uid).order('sort_order'),
    supabase.from('groups').select('id, chapter_id, name, color, sort_order, created_at').eq('user_id', uid).order('sort_order'),
    supabase.from('motions').select('id, chapter_id, name, default_points, default_hours, group_id, hidden, parent_id, sort_order, created_at').eq('user_id', uid).order('created_at'),
    // motion_swells has no user_id column — it's scoped by the `own motion_swells`
    // RLS policy (via the parent motion). Filtering on user_id here errored and
    // silently returned zero junctions, so exports never captured assignments.
    supabase.from('motion_swells').select('motion_id, swell_id, contribution_weight'),
    supabase.from('logs').select('id, chapter_id, motion_id, points, hours, intensity, logged_at, motions(name)').eq('user_id', uid).order('logged_at'),
    supabase.from('milestones').select('id, swell_id, motion_id, name, kind, cadence, target_count, completed_at, bonus_points, sort_order, created_at').eq('user_id', uid).order('sort_order'),
    supabase.from('wave_checkins').select('id, chapter_id, energy, alignment, duration_seconds, checked_in_at').eq('user_id', uid).order('checked_in_at'),
    supabase.from('reflections').select('id, chapter_id, cycle_type, cycle_start, cycle_end, expectation_text, observation_text, intention_text, did_tune, body_text, prompt_text, created_at').eq('user_id', uid).order('created_at'),
  ])

  return {
    user_email: user.email ?? null,
    chapters: chapters.data ?? [],
    swells: swells.data ?? [],
    groups: groups.data ?? [],
    motions: motions.data ?? [],
    motionSwells: (motionSwells.data ?? []).map(l => ({ ...l, contribution_weight: Number(l.contribution_weight) })),
    logs: logs.data ?? [],
    milestones: milestones.data ?? [],
    waves: waves.data ?? [],
    reflections: reflections.data ?? [],
  }
}
