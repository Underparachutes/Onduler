import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Onduler
        </h1>
        <p className="mb-8 text-sm text-zinc-500">
          Ride your waves. Hold your tides.
        </p>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
