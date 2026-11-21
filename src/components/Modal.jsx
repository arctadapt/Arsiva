import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const node = ref.current

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current() }
      if (e.key !== 'Tab' || !node) return
      const items = [...node.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey)
    const scrollY = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ;(node?.querySelector('[data-autofocus]') ?? node)?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = scrollY
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[rgb(6_28_37/0.6)]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal-in relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface shadow-2xl outline-none sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <h2 id={titleId} className="text-lg font-bold leading-snug">{title}</h2>
          <button onClick={onClose} className="-mr-2 -mt-1 rounded-lg p-2 text-muted hover:bg-sunken hover:text-ink" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 text-[15px] leading-relaxed">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-2">{footer}</div>}
      </div>
    </div>
  )
}
