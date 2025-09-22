import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

function getVariantClasses(variant) {
  switch (variant) {
    case 'primary':
      return 'inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    case 'danger':
      return 'inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
    default:
      return 'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
  }
}

export default function Modal({ open, onClose, title, description, children, actions = [] }) {
  useEffect(() => {
    if (!open) return
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

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      onMouseDown={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl">
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-200/70">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                className="rounded-full p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => onClose?.()}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2 bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
            {actions.map(({ label, onClick, variant = 'secondary', disabled = false }, index) => (
              <button
                key={index}
                type="button"
                disabled={disabled}
                className={`${getVariantClasses(variant)} ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                onClick={onClick}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
