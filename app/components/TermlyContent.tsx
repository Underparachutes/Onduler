'use client'

import { useRef, useEffect } from 'react'

export function TermlyContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html
  }, [html])

  return <div ref={ref} className="legal-content" />
}
