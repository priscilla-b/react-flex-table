import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

function getVariantClasses(variant) {
  switch (variant) {
    case 'primary':
      return 'inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2'
    case 'danger':
      return 'inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(220,38,38,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
    default:
      return 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2'
  }
}

export default function SidePanel({
  open,
  onClose,
  title,
  description,
  children,
  actions = [],
  widthClass = 'w-full sm:w-[60vw] lg:w-[40vw]',
}) {
  useEffect(() => {
    if (!open || !onClose) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') {
    return null
  }

  const overlay = (
    <div
      className={`absolute inset-0 bg-slate-900/10 transition-opacity duration-300 ${onClose ? 'cursor-pointer' : 'pointer-events-none'}`}
      aria-hidden="true"
      onClick={onClose || undefined}
    />
  )

  const panelContent = (
    <div className="fixed inset-0 z-50 flex justify-end">
      {overlay}
      <div
        className={`pointer-events-auto ml-auto flex h-full w-full ${widthClass} transform transition-transform duration-300 ease-out`}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden border-l border-slate-200/70 bg-gradient-to-b from-white/90 via-white/85 to-slate-50/90 shadow-[0_24px_60px_rgba(15,23,42,0.22)] sm:rounded-l-[28px]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 bg-white/70 px-8 py-6 sm:px-10">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Create</p>
              <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
              {description && (
                <p className="text-sm text-slate-500/90">{description}</p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                className="rounded-full border border-transparent bg-white/70 p-2 text-slate-400 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                onClick={() => onClose?.()}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-6 sm:px-10 custom-scrollbar">
            {children}
          </div>
          {actions.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/70 bg-white/75 px-8 py-5 sm:px-10">
              {actions.map(({ label, onClick, variant = 'secondary', disabled = false }, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={disabled}
                  className={`${getVariantClasses(variant)} ${disabled ? 'opacity-60 cursor-not-allowed saturate-[.8]' : ''}`}
                  onClick={onClick}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(panelContent, document.body)
}

