import React from 'react'

export default function Toolbar({
  onAdd,
  onDeleteSelected,
  selectedCount,
  children,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 animate-slide-in">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button 
          onClick={onAdd} 
          className="toolbar-button toolbar-button-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Add New</span>
          <span className="sm:hidden">Add</span>
        </button>
        <button
          onClick={onDeleteSelected}
          disabled={!selectedCount}
          className={selectedCount ? 'toolbar-button toolbar-button-danger' : 'toolbar-button toolbar-button-disabled'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden sm:inline">Delete ({selectedCount||0})</span>
          <span className="sm:hidden">Del ({selectedCount||0})</span>
        </button>
        {selectedCount > 0 && (
          <div className="text-xs sm:text-sm text-gray-600 bg-blue-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-blue-200">
            {selectedCount} selected
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
        {children}
      </div>
    </div>
  )
}