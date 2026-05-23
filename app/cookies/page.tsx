import { readFileSync } from 'fs'
import { join } from 'path'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy — Onduler',
  description: 'How Onduler uses cookies and similar technologies.',
}

export default function CookiesPage() {
  const html = readFileSync(join(process.cwd(), 'app/cookies/content.html'), 'utf-8')

  return (
    <div className="px-4 py-12 pb-24">
      <Link
        href="/"
        className="mb-8 inline-block text-xs text-th-muted hover:text-th-text transition-colors"
      >
        &larr; Back
      </Link>
      <div
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
