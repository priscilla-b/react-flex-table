import React, { useEffect, useRef, useState } from 'react'
import useClickOutside from '../hooks/useClickOutside'

function resolveHeaderLabel(column) {
  if (!column) return ''
  if (typeof column.header === 'string') return column.header
  if (typeof column.header === 'function') return column.accessorKey || 'Column'
  return column.accessorKey || String(column.id || '')
}

export default function ColumnVisibilityMenu({ table }) {
  const containerRef = useRef(null)
  const [open, setOpen] = useState(false)

  useClickOutside(containerRef, () => setOpen(false), open)

  useEffect(() => {
    if (!open) return undefined
    const handler = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="toolbar-button bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
        Columns
        <svg className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="dropdown-menu animate-fade-in w-[260px] min-w-[200px]">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2">Show / hide columns</div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {table.getAllLeafColumns().map(col => (
              <label key={col.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100">
                <input
                  type="checkbox"
                  className="checkbox w-4 h-4"
                  checked={col.getIsVisible()}
                  onChange={col.getToggleVisibilityHandler()}
                />
                <span className="truncate">{resolveHeaderLabel(col.columnDef)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
