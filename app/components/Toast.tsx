'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type ToastAction = { label: string; onClick: () => void }

type ToastData = {
  message: string
  primary?: ToastAction
  secondary?: ToastAction
  duration?: number
}

type ToastContextValue = {
  show: (toast: ToastData) => void
  dismiss: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimer()
    setVisible(false)
    setTimeout(() => setToast(null), 200)
  }, [clearTimer])

  const show = useCallback((data: ToastData) => {
    clearTimer()
    setToast(data)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => setToast(null), 200)
    }, data.duration ?? 4000)
  }, [clearTimer])

  useEffect(() => clearTimer, [clearTimer])

  return (
    <ToastContext value={{ show, dismiss }}>
      {children}
      {toast && (
        <div
          className="fixed left-1/2 z-50 flex items-center gap-3 rounded-lg bg-th-text px-4 py-2.5 shadow-lg transition-all duration-200 ease-out max-w-[calc(100vw-2rem)] md:max-w-lg"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            opacity: visible ? 1 : 0,
            transform: `translateX(-50%) translateY(${visible ? '0' : '-100%'})`,
          }}
        >
          <span className="min-w-0 truncate text-sm text-th-bg">{toast.message}</span>
          {toast.primary && (
            <button
              onClick={() => { toast.primary!.onClick(); dismiss() }}
              className="shrink-0 text-sm font-semibold text-th-bg opacity-80 hover:opacity-100"
            >
              {toast.primary.label}
            </button>
          )}
          {toast.secondary && (
            <>
              <span className="text-th-bg opacity-40">·</span>
              <button
                onClick={() => { toast.secondary!.onClick(); dismiss() }}
                className="shrink-0 text-sm font-semibold text-th-bg opacity-80 hover:opacity-100"
              >
                {toast.secondary.label}
              </button>
            </>
          )}
        </div>
      )}
    </ToastContext>
  )
}
