'use client'

import { useEffect } from 'react'

export function TimezoneSync() {
  useEffect(() => {
    const offset = new Date().getTimezoneOffset()
    document.cookie = `tz_offset=${offset}; path=/; max-age=31536000; SameSite=Lax`
  }, [])
  return null
}
