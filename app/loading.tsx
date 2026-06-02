export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="relative select-none">
        <p className="font-display text-2xl font-light tracking-wide text-th-faint" style={{ textShadow: 'none' }}>
          onduler
        </p>
        <p
          aria-hidden
          className="absolute inset-0 font-display text-2xl font-light tracking-wide"
          style={{
            color: 'var(--th-swell-3)',
            animation: 'onduler-fill 2s ease-in-out infinite',
            clipPath: 'inset(0 100% 0 0)',
          }}
        >
          onduler
        </p>
      </div>
    </div>
  )
}
