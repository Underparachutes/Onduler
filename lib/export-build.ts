// Pure assembly of the v3 export payload from raw DB rows.
//
// Extracted from the export button so the shaping logic is unit-testable
// without a browser or a DEK: nesting motion→swell junctions, decrypting
// content, and mapping every table into the payload. The original junction-drop
// bug lived upstream (a bad query), but the symptom — assignments missing from
// the file — is exactly what these tests guard against, plus any future
// regression that drops a field or array.
//
// `decrypt` is injected (the button passes the real content-decrypt; tests pass
// identity) and is only ever called with non-null strings.

import type { ExportPayload, RawExport } from '@/lib/export-format'

export async function assembleExport(
  raw: RawExport,
  decrypt: (v: string) => Promise<string>,
  exportedAt: string,
): Promise<ExportPayload> {
  // Decrypt a nullable field, preserving null (so restore can tell "no entry"
  // from "empty string").
  const decN = (v: string | null): Promise<string | null> => (v == null ? Promise.resolve(null) : decrypt(v))

  const swellsByMotion = new Map<string, { swell_id: string; weight: number }[]>()
  for (const l of raw.motionSwells) {
    const list = swellsByMotion.get(l.motion_id) ?? []
    list.push({ swell_id: l.swell_id, weight: l.contribution_weight })
    swellsByMotion.set(l.motion_id, list)
  }

  return {
    version: 3,
    exported_at: exportedAt,
    user_email: raw.user_email,
    chapters: raw.chapters,
    swells: await Promise.all(raw.swells.map(async s => ({ ...s, name: await decrypt(s.name) }))),
    buckets: await Promise.all(raw.groups.map(async g => ({ ...g, name: await decrypt(g.name) }))),
    motions: await Promise.all(
      raw.motions.map(async m => ({ ...m, name: await decrypt(m.name), swells: swellsByMotion.get(m.id) ?? [] })),
    ),
    logs: await Promise.all(
      raw.logs.map(async log => {
        const mn = Array.isArray(log.motions) ? log.motions[0]?.name ?? null : log.motions?.name ?? null
        return {
          id: log.id,
          chapter_id: log.chapter_id,
          logged_at: log.logged_at,
          motion_id: log.motion_id,
          motion_name: await decN(mn),
          points: log.points,
          hours: Number(log.hours),
          intensity: log.intensity,
        }
      }),
    ),
    waypoints: await Promise.all(
      raw.milestones.map(async m => ({
        id: m.id,
        swell_id: m.swell_id,
        motion_id: m.motion_id,
        name: await decrypt(m.name),
        kind: m.kind,
        cadence: m.cadence,
        target_count: m.target_count,
        completed_at: m.completed_at,
        bonus_points: m.bonus_points,
        sort_order: m.sort_order,
        created_at: m.created_at,
      })),
    ),
    waves: raw.waves.map(w => ({
      id: w.id,
      chapter_id: w.chapter_id,
      energy: Number(w.energy),
      alignment: Number(w.alignment),
      duration_seconds: w.duration_seconds,
      checked_in_at: w.checked_in_at,
    })),
    anchors: await Promise.all(
      raw.reflections.map(async a => ({
        id: a.id,
        chapter_id: a.chapter_id,
        cycle_type: a.cycle_type,
        cycle_start: a.cycle_start,
        cycle_end: a.cycle_end,
        expectation_text: await decN(a.expectation_text),
        observation_text: await decN(a.observation_text),
        intention_text: await decN(a.intention_text),
        did_tune: a.did_tune,
        body_text: await decN(a.body_text),
        prompt_text: await decN(a.prompt_text),
        created_at: a.created_at,
      })),
    ),
  }
}
