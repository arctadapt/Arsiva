import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const push = useCallback((tone, message) => {
    const id = nextId.current++
    setItems((xs) => [...xs.slice(-2), { id, tone, message }])
    setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000)
  }, [dismiss])

  const toast = useRef({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
  }).current

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="modal-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-sm shadow-lg"
          >
            {t.tone === 'error'
              ? <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-bad" aria-hidden />
              : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />}
            <p className="flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-muted hover:text-ink" aria-label="Tutup pesan">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
