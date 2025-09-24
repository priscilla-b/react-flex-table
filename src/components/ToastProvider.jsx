import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

function ToastItem({ toast, onClose }) {
  const { id, message, type } = toast
  const base = 'w-full sm:w-80 pointer-events-auto rounded-lg shadow-lg ring-1 ring-black/5 p-3 flex items-start gap-3 animate-fade-in'
  const typeClasses =
    type === 'success'
      ? 'bg-green-50 text-green-800 ring-green-200'
      : type === 'error'
      ? 'bg-red-50 text-red-800 ring-red-200'
      : 'bg-gray-50 text-gray-800 ring-gray-200'

  return (
    <div className={`${base} ${typeClasses}`} role="status" aria-live="polite">
      <div className="shrink-0 mt-0.5">
        {type === 'success' && (
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
        )}
        {type === 'error' && (
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 10-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
        )}
        {type === 'info' && (
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 9a1 1 0 112 0v5a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"/></svg>
        )}
      </div>
      <div className="text-sm font-medium leading-5">{message}</div>
      <button
        aria-label="Close notification"
        className="ml-auto text-current/70 hover:text-current"
        onClick={() => onClose(id)}
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
      </button>
    </div>
  )
}

export default function ToastProvider({ children, autoHideMs = 3200, maxToasts = 5 }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timers = timersRef.current
    const existing = timers.get(id)
    if (existing) {
      clearTimeout(existing)
      timers.delete(id)
    }
  }, [])

  const push = useCallback((message, { type = 'info', duration } = {}) => {
    const id = ++idCounter
    setToasts(prev => {
      const next = [{ id, message, type }, ...prev]
      return next.slice(0, maxToasts)
    })
    const timers = timersRef.current
    const timeout = setTimeout(() => remove(id), duration ?? autoHideMs)
    timers.set(id, timeout)
    return id
  }, [autoHideMs, maxToasts, remove])

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current.clear()
  }, [])

  const api = useMemo(() => ({
    show: (message, options) => push(message, options),
    success: (message, options) => push(message, { ...options, type: 'success' }),
    error: (message, options) => push(message, { ...options, type: 'error' }),
    info: (message, options) => push(message, { ...options, type: 'info' }),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onClose={remove} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}


