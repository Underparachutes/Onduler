'use client'

import { useState, useEffect, useCallback } from 'react'

const LS_ONBOARDING_SEEN = 'onduler_install_onboarding_seen'
const LS_DISMISSED_AT = 'onduler_install_dismissed_at'
const LS_DISMISS_COUNT = 'onduler_install_dismiss_count'
const LS_COMPLETED = 'onduler_install_completed'

export function getIsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

export function getIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

export function getIsAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/.test(navigator.userAgent)
}

export function getIsMobile(): boolean {
  return getIsIOS() || getIsAndroid()
}

export function getIsIOSSafari(): boolean {
  if (!getIsIOS()) return false
  const ua = navigator.userAgent
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

export function markOnboardingSeen(): void {
  try { localStorage.setItem(LS_ONBOARDING_SEEN, 'true') } catch {}
}

export function markInstallCompleted(): void {
  try { localStorage.setItem(LS_COMPLETED, 'true') } catch {}
}

function getDismissCount(): number {
  try { return parseInt(localStorage.getItem(LS_DISMISS_COUNT) ?? '0', 10) || 0 } catch { return 0 }
}

function getDismissedAt(): number | null {
  try {
    const v = localStorage.getItem(LS_DISMISSED_AT)
    return v ? new Date(v).getTime() : null
  } catch { return null }
}

function getInstallCompleted(): boolean {
  try { return localStorage.getItem(LS_COMPLETED) === 'true' } catch { return false }
}

export function dismissInstallTile(): void {
  try {
    const count = getDismissCount() + 1
    localStorage.setItem(LS_DISMISS_COUNT, String(count))
    localStorage.setItem(LS_DISMISSED_AT, new Date().toISOString())
  } catch {}
}

export function shouldShowOnboardingInstall(): boolean {
  if (typeof window === 'undefined') return false
  if (getIsStandalone()) return false
  if (getInstallCompleted()) return false
  if (!getIsMobile()) return false
  return true
}

export function shouldShowInstallTile(): boolean {
  if (typeof window === 'undefined') return false
  if (getIsStandalone()) return false
  if (getInstallCompleted()) return false
  if (!getIsMobile()) return false

  const count = getDismissCount()
  if (count >= 3) return false

  const dismissedAt = getDismissedAt()
  if (dismissedAt !== null) {
    const cooldownMs = count === 1 ? 14 * 86400000 : 30 * 86400000
    if (Date.now() - dismissedAt < cooldownMs) return false
  }

  return true
}

let deferredPrompt: any = null

export function initBeforeInstallPrompt(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
  })
  window.addEventListener('appinstalled', () => {
    markInstallCompleted()
  })
}

export async function triggerAndroidInstall(): Promise<'accepted' | 'dismissed' | null> {
  if (!deferredPrompt) return null
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  if (outcome === 'accepted') markInstallCompleted()
  return outcome
}

export function hasDeferredPrompt(): boolean {
  return deferredPrompt !== null
}

export function useInstallState() {
  const [showTile, setShowTile] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    setShowTile(shouldShowInstallTile())
    setShowOnboarding(shouldShowOnboardingInstall())

    initBeforeInstallPrompt()

    const mq = window.matchMedia('(display-mode: standalone)')
    const handler = () => {
      if (mq.matches) {
        markInstallCompleted()
        setShowTile(false)
        setShowOnboarding(false)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const dismiss = useCallback(() => {
    dismissInstallTile()
    setShowTile(false)
  }, [])

  return { showTile, showOnboarding, dismiss }
}
