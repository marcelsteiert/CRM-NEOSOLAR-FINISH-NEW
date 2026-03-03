import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  width?: string
  children: ReactNode
}

export default function SlidePanel({
  open,
  onClose,
  title,
  subtitle,
  width = '480px',
  children,
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Trap focus inside panel when open
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus()
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-[70] transition-all duration-300',
          open
            ? 'bg-bg/60 backdrop-blur-sm pointer-events-auto'
            : 'bg-transparent backdrop-blur-none pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Detail-Panel'}
        tabIndex={-1}
        className={[
          'fixed top-0 right-0 bottom-0 z-[80] flex flex-col outline-none',
          'border-l border-border bg-bg-sub',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        style={{ width }}
      >
        {/* Glass overlay effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(245,158,11,0.02) 0%, transparent 30%)',
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            {title && (
              <h2 className="text-base font-bold tracking-[-0.02em]">{title}</h2>
            )}
            {subtitle && (
              <p className="text-[12px] text-text-sec mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Panel schliessen"
            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all duration-150"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </>
  )
}
