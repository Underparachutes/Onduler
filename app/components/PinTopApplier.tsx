'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'onduler-pin-top'

export function readPinTopUnpinned(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === 'false'
}

export function writePinTopUnpinned(unpinned: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, unpinned ? 'false' : 'true')
  document.body.classList.toggle('unpinned-top', unpinned)
}

export function PinTopApplier() {
  useEffect(() => {
    const unpinned = readPinTopUnpinned()
    document.body.classList.toggle('unpinned-top', unpinned)
    return () => { document.body.classList.remove('unpinned-top') }
  }, [])
  return null
}
