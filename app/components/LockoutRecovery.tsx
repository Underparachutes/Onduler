'use client'

// The door out of the unlock screen for a genuine lockout: the user has lost
// every way to unlock (passkey, password, recovery code), so their encrypted
// content can't be opened by anyone, us included — that's the E2EE promise, and
// its cost. But almost none of their account is actually encrypted: logs, dates,
// colors, progress, and structure are all intact. Only the names and journal
// text are sealed. So we offer two ways out, gentle first:
//
//   1. Keep my history, reset my labels (RELABEL) — set up a fresh key, keep all
//      the data, and rewrite only the unreadable fields under the new key (blank
//      names to rename, cleared journal text). Logs and history survive.
//   2. Delete everything and start over (WIPE) — the original last resort.
//
// Shown inside both the UnlockGate overlay and /protect's unlock flow. Spec:
// docs/specs/private-content-encryption.md (step 7 / Recovery).

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDek } from '@/app/components/DekProvider'
import { KeySetup, Shell, btnPrimary } from '@/app/components/KeySetup'
import { startFreshAfterLockout, resetKeysForRelabel } from '@/app/actions/keys'
import { runRelabel } from '@/app/protect/runRelabel'

type Stage =
  | 'collapsed'
  | 'choice'
  | 'relabel-confirm'
  | 'relabel-setup'
  | 'relabel-securing'
  | 'delete-confirm'

export function LockoutRecovery() {
  const router = useRouter()
  const { setDek, refreshEncEnabled, clearDek } = useDek()
  const [stage, setStage] = useState<Stage>('collapsed')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDek, setNewDek] = useState<CryptoKey | null>(null)

  // --- relabel: clear the stale keys, then hand off to fresh KeySetup ---
  async function beginRelabel() {
    setBusy(true)
    setError(null)
    const res = await resetKeysForRelabel()
    if (res.error) {
      setError(res.error)
      setBusy(false)
      return
    }
    setBusy(false)
    setStage('relabel-setup')
  }

  // --- wipe: the original destructive escape ---
  async function doWipe() {
    setBusy(true)
    setError(null)
    const res = await startFreshAfterLockout()
    if (res.error) {
      setError(res.error)
      setBusy(false)
      return
    }
    await clearDek()
    await refreshEncEnabled()
    router.replace('/protect')
  }

  // Full-screen takeover for the multi-step relabel (key setup + rewrite), so it
  // covers the unlock panel it was launched from.
  if (stage === 'relabel-setup') {
    return (
      <FullScreen>
        {/* adoptDek=false: don't push the new key into DekProvider yet — doing so
            would unmount this flow (the gate sees a DEK and closes) before the
            rewrite runs. We adopt it ourselves in onDone, after runRelabel. */}
        <KeySetup
          adoptDek={false}
          onComplete={dek => {
            setNewDek(dek ?? null)
            setStage('relabel-securing')
          }}
        />
      </FullScreen>
    )
  }

  if (stage === 'relabel-securing') {
    return (
      <FullScreen>
        {newDek ? (
          <RelabelSecuring
            dek={newDek}
            onDone={async () => {
              // Rewrite done — now adopt the key (cache + provider) and pull the
              // freshly relabeled rows with a full navigation.
              await setDek(newDek)
              router.replace('/dashboard')
            }}
          />
        ) : (
          <Shell>
            <p className="text-sm text-red-500">
              Lost the new key before resetting your labels. Reload and try again.
            </p>
          </Shell>
        )}
      </FullScreen>
    )
  }

  if (stage === 'collapsed') {
    return (
      <button
        className="mt-8 w-full text-center text-xs text-th-faint transition-colors hover:text-th-muted"
        onClick={() => setStage('choice')}
      >
        I’ve lost my passkey, password, and recovery code
      </button>
    )
  }

  if (stage === 'choice') {
    return (
      <div className="mt-8 rounded-xl border border-th-border p-4">
        <p className="mb-3 text-sm leading-relaxed text-th-muted">
          If you’ve lost all three, your old private notes can’t be opened — not by anyone,
          including us. That’s the privacy promise, and its cost.
        </p>
        <p className="mb-4 text-sm leading-relaxed text-th-muted">
          But the rest of your account isn’t locked. You don’t have to lose it.
        </p>
        <button className={btnPrimary + ' w-full'} onClick={() => setStage('relabel-confirm')}>
          Keep my history, reset my labels
        </button>
        <p className="mt-2 mb-4 text-xs leading-relaxed text-th-faint">
          Your logs, dates, and progress all stay. Only the names you can’t open reset to blanks
          you can rename, and journal text that can’t be read is cleared.
        </p>
        <button
          className="w-full text-center text-xs text-th-faint transition-colors hover:text-red-500"
          onClick={() => setStage('delete-confirm')}
        >
          Or delete everything and start over
        </button>
        <button
          className="mt-4 w-full text-center text-xs text-th-faint transition-colors hover:text-th-muted"
          onClick={() => setStage('collapsed')}
        >
          Never mind
        </button>
      </div>
    )
  }

  if (stage === 'relabel-confirm') {
    return (
      <div className="mt-8 rounded-xl border border-th-border p-4">
        <p className="mb-3 text-sm leading-relaxed text-th-muted">
          You’ll set up a fresh key, then keep everything — logs, swells, motions, dates, progress.
        </p>
        <p className="mb-4 text-sm leading-relaxed text-th-muted">
          Anything still locked gets a blank name you can rename, and journal text that can’t be
          opened is cleared. This can’t bring those words back, but nothing else is lost.
        </p>
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        <button className={btnPrimary + ' w-full'} disabled={busy} onClick={beginRelabel}>
          {busy ? 'Getting ready…' : 'Set up a new key'}
        </button>
        <button
          className="mt-3 w-full text-center text-xs text-th-faint transition-colors hover:text-th-muted disabled:opacity-50"
          disabled={busy}
          onClick={() => {
            setError(null)
            setStage('choice')
          }}
        >
          Back
        </button>
      </div>
    )
  }

  // delete-confirm — the blunt, irreversible last resort.
  return (
    <div className="mt-8 rounded-xl border border-th-border p-4">
      <p className="mb-3 text-sm leading-relaxed text-th-muted">
        This permanently deletes everything — your logs, history, and locked content — and can’t be
        undone. If you only want your labels back, go back and keep your history instead.
      </p>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <button
        className="w-full rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
        disabled={busy}
        onClick={doWipe}
      >
        {busy ? 'Starting fresh…' : 'Permanently delete and start fresh'}
      </button>
      <button
        className="mt-3 w-full text-center text-xs text-th-faint transition-colors hover:text-th-muted disabled:opacity-50"
        disabled={busy}
        onClick={() => {
          setError(null)
          setStage('choice')
        }}
      >
        Back
      </button>
    </div>
  )
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-th-bg">{children}</div>
}

// Runs the content rewrite once with the freshly created DEK, then leaves. Mirrors
// /protect's SecuringStep: a ref guard (not an active/cleanup flag) survives
// StrictMode's double-invoke so the single run's redirect is never cancelled.
function RelabelSecuring({ dek, onDone }: { dek: CryptoKey; onDone: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const ranRef = useRef(-1)

  useEffect(() => {
    if (ranRef.current === attempt) return
    ranRef.current = attempt
    ;(async () => {
      try {
        await runRelabel(dek)
        await onDone()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong resetting your labels.')
      }
    })()
  }, [dek, onDone, attempt])

  return (
    <Shell>
      <h1 className="mb-3 text-2xl font-semibold text-th-text">Resetting your labels</h1>
      {!error ? (
        <p className="text-sm leading-relaxed text-th-muted">
          Setting up your content under your new key. Your logs and history are untouched. This
          happens once and may take a moment.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-red-500">{error}</p>
          <p className="mb-4 text-xs text-th-muted">
            Your data is safe — your new key is set up. You can retry.
          </p>
          <button
            className={btnPrimary + ' w-full'}
            onClick={() => {
              setError(null)
              setAttempt(a => a + 1)
            }}
          >
            Try again
          </button>
        </>
      )}
    </Shell>
  )
}
