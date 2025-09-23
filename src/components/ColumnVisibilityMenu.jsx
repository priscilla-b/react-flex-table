import React from 'react'

function resolveHeaderLabel(column) {
  if (!column) return ''
  if (typeof column.header === 'string') return column.header
  if (typeof column.header === 'function') return column.accessorKey || 'Column'
  return column.accessorKey || String(column.id || '')
}

export default function ColumnVisibilityMenu({ table }) {
  return (
    <details className="relative group">
      <summary className="toolbar-button bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
        Columns
        <svg className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="dropdown-menu animate-slide-in">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Show/Hide Columns</div>
        {table.getAllLeafColumns().map(col => (
          <label key={col.id} className="dropdown-item">
            <input 
              type="checkbox" 
              className="checkbox w-4 h-4"
              checked={col.getIsVisible()} 
              onChange={col.getToggleVisibilityHandler()} 
            />
            <span className="text-gray-700">{resolveHeaderLabel(col.columnDef)}</span>
          </label>
        ))}
      </div>
    </details>
  )
}