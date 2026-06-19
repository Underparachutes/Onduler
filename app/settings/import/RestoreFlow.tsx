'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { getImportEntities, type ImportClearMode } from '@/app/actions/import'
import { restoreExport } from '@/app/actions/restore'
import { resolveRestore } from '@/lib/restore-resolve'
import { useContentCrypto } from '@/app/components/useContentCrypto'
import type { ExportPayload } from '@/lib/export-format'
import type { ExistingEntities } from '@/lib/import-resolve'

type Step = 'input' | 'preview' | 'done'
type RestoreCounts = { chapters: number; swells: number; motions: number; buckets: number; logs: number; waypoints: number; anchors: number }

const CLEAR_OPTIONS: { mode: ImportClearMode; label: string; desc: string }[] = [
  { mode: 'none', label: 'Add to what I have', desc: 'Restores alongside your current data. Buckets, swells, and motions with matching names are reused.' },
  { mode: 'archive', label: 'Start fresh (recommended)', desc: 'Archives the current chapter and restores into a clean one. Nothing is lost.' },
  { mode: 'delete', label: 'Replace everything', desc: 'Deletes your current chapter — motions, swells, logs, anchors — then restores.' },
]

// Accepts the v2 export, and tolerates legacy v1 files (no version, no anchors).
// Returns null if the JSON clearly isn't an Onduler export.
function coercePayload(raw: unknown): ExportPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.swells) || !Array.isArray(o.motions)) return null
  return {
    version: 3,
    exported_at: typeof o.exported_at === 'string' ? o.exported_at : '',
    user_email: typeof o.user_email === 'string' ? o.user_email : null,
    chapters: (Array.isArray(o.chapters) ? o.chapters : []) as ExportPayload['chapters'],
    swells: o.swells as ExportPayload['swells'],
    buckets: (Array.isArray(o.buckets) ? o.buckets : []) as ExportPayload['buckets'],
    motions: o.motions as ExportPayload['motions'],
    logs: (Array.isArray(o.logs) ? o.logs : []) as ExportPayload['logs'],
    waypoints: (Array.isArray(o.waypoints) ? o.waypoints : []) as ExportPayload['waypoints'],
    waves: (Array.isArray(o.waves) ? o.waves : []) as ExportPayload['waves'],
    anchors: (Array.isArray(o.anchors) ? o.anchors : []) as ExportPayload['anchors'],
  }
}

export function RestoreFlow({ hasExistingData }: { hasExistingData: boolean }) {
  const { encryptContent, decryptContent } = useContentCrypto()
  const [step, setStep] = useState<Step>('input')
  const [payload, setPayload] = useState<ExportPayload | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [counts, setCounts] = useState<RestoreCounts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clearMode, setClearMode] = useState<ImportClearMode>('none')
  const [armedDelete, setArmedDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleFile(file: File) {
    setError(null)
    try {
      const parsed = coercePayload(JSON.parse(await file.text()))
      if (!parsed) {
        setError("This doesn't look like an Onduler export. Pick the .json file you downloaded.")
        return
      }
      setPayload(parsed)
      setFileName(file.name)
      setStep('preview')
    } catch {
      setError("Couldn't read that file. Make sure it's the .json export, not edited.")
    }
  }

  function handleRestore() {
    if (!payload) return
    if (clearMode === 'delete' && !armedDelete) {
      setArmedDelete(true)
      return
    }
    setError(null)
    startTransition(async () => {
      // Dedup against existing only when merging; archive/delete start clean.
      let existing: ExistingEntities = { groups: [], swells: [], motions: [] }
      if (clearMode === 'none') {
        const raw = await getImportEntities()
        existing = {
          groups: await Promise.all(raw.groups.map(async g => ({ id: g.id, name: await decryptContent(g.name) }))),
          swells: await Promise.all(raw.swells.map(async s => ({ id: s.id, name: await decryptContent(s.name) }))),
          motions: await Promise.all(raw.motions.map(async m => ({ id: m.id, name: await decryptContent(m.name) }))),
        }
      }

      const plan = resolveRestore(payload, existing)
      const encN = (v: string | null) => (v == null ? Promise.resolve(null) : encryptContent(v))

      // Re-encrypt every content field before the plan leaves the browser.
      const encPlan = {
        ...plan,
        newGroups: await Promise.all(plan.newGroups.map(async g => ({ ...g, name: await encryptContent(g.name) }))),
        newSwells: await Promise.all(plan.newSwells.map(async s => ({ ...s, name: await encryptContent(s.name) }))),
        newMotions: await Promise.all(plan.newMotions.map(async m => ({ ...m, name: await encryptContent(m.name) }))),
        waypoints: await Promise.all(plan.waypoints.map(async w => ({ ...w, name: await encryptContent(w.name) }))),
        anchors: await Promise.all(
          plan.anchors.map(async a => ({
            ...a,
            expectationText: await encN(a.expectationText),
            observationText: await encN(a.observationText),
            intentionText: await encN(a.intentionText),
            bodyText: await encN(a.bodyText),
            promptText: await encN(a.promptText),
          })),
        ),
      }

      const result = await restoreExport(encPlan, clearMode)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setCounts(result.counts)
      setStep('done')
    })
  }

  if (step === 'done' && counts) {
    const parts: string[] = []
    if (counts.swells > 0) parts.push(`${counts.swells} swell${counts.swells === 1 ? '' : 's'}`)
    if (counts.motions > 0) parts.push(`${counts.motions} motion${counts.motions === 1 ? '' : 's'}`)
    if (counts.buckets > 0) parts.push(`${counts.buckets} bucket${counts.buckets === 1 ? '' : 's'}`)
    if (counts.logs > 0) parts.push(`${counts.logs} log${counts.logs === 1 ? '' : 's'}`)
    if (counts.anchors > 0) parts.push(`${counts.anchors} anchor${counts.anchors === 1 ? '' : 's'}`)
    if (counts.waypoints > 0) parts.push(`${counts.waypoints} waypoint${counts.waypoints === 1 ? '' : 's'}`)
    if (counts.chapters > 0) parts.push(`${counts.chapters} past chapter${counts.chapters === 1 ? '' : 's'}`)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-th-text">Restored {parts.length ? parts.join(', ') : 'your data'}.</p>
        <Link href="/dashboard" className="inline-block rounded-lg bg-th-btn px-4 py-2 text-center text-sm font-medium text-th-btn-text active:scale-[0.97]">
          Go to motions
        </Link>
      </div>
    )
  }

  if (step === 'preview' && payload) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-widest text-th-faint">Ready to restore</p>
        <p className="text-sm text-th-secondary">From {fileName}</p>
        <ul className="flex flex-col gap-1 text-sm text-th-text">
          <li>{payload.swells.length} swells · {payload.motions.length} motions · {payload.buckets.length} buckets</li>
          <li>{payload.logs.length} logs · {payload.anchors.length} anchors · {payload.waypoints.length} waypoints</li>
          {payload.chapters.length > 1 && (
            <li className="text-th-muted">{payload.chapters.length} chapters of history</li>
          )}
        </ul>

        {hasExistingData && (
          <div>
            <p className="mb-2 text-sm text-th-secondary">You already have data here</p>
            <div className="flex flex-col gap-2">
              {CLEAR_OPTIONS.map(o => (
                <button
                  key={o.mode}
                  onClick={() => { setClearMode(o.mode); setArmedDelete(false) }}
                  className={`rounded-lg border p-3 text-left transition-colors ${clearMode === o.mode ? 'border-th-btn' : 'border-th-border hover:bg-th-surface'}`}
                >
                  <p className="text-sm font-medium text-th-text">{o.label}</p>
                  <p className="text-xs text-th-muted">{o.desc}</p>
                </button>
              ))}
            </div>
            {clearMode === 'delete' && (
              <p className="mt-2 text-xs text-red-500">Replacing deletes your current chapter and every log in it. This cannot be undone.</p>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleRestore}
            disabled={isPending}
            className="rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text active:scale-[0.97] disabled:opacity-50"
          >
            {isPending ? 'Restoring…' : clearMode === 'delete' ? (armedDelete ? 'Tap again to confirm' : 'Replace and restore') : clearMode === 'archive' ? 'Archive and restore' : 'Restore'}
          </button>
          <button
            onClick={() => { setStep('input'); setPayload(null); setError(null); setArmedDelete(false); setClearMode('none') }}
            className="rounded-lg border border-th-border px-4 py-2 text-sm text-th-muted active:scale-[0.97]"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-th-secondary">
        Restore from a backup file you exported earlier (Settings → Your data → Download). This brings back your swells, motions, logs, and journal.
      </p>
      <label className="self-start cursor-pointer rounded-lg border border-th-border px-4 py-2 text-sm text-th-text transition-colors hover:bg-th-surface active:scale-[0.97]">
        Choose backup file
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }}
        />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
