import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export const ToastContext = createContext<{
  toast: (kind: ToastKind, message: string) => void
} | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}
