import React from 'react'

const secondaryEnabled = 'toolbar-button border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
export default function Toolbar({
  onAdd,
  onDeleteSelected,
  onBulkEdit,
  onBulkDuplicate,
  onBulkUpload,
  selectedCount,
  children,
}) {
  const hasSelection = Boolean(selectedCount)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 animate-slide-in">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={onAdd}
          className="toolbar-button toolbar-button-primary"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Add New</span>
          <span className="sm:hidden">Add</span>
        </button>
        {hasSelection && (
          <button
            onClick={onDeleteSelected}
            className="toolbar-button toolbar-button-danger"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">Delete ({selectedCount || 0})</span>
            <span className="sm:hidden">Del ({selectedCount || 0})</span>
          </button>
        )}
        {onBulkEdit && hasSelection && (
          <button
            onClick={onBulkEdit}
            className={secondaryEnabled}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 3.487l2.651 2.651a1.5 1.5 0 010 2.121l-8.49 8.49-3.005.334a.5.5 0 01-.552-.552l.334-3.005 8.49-8.49a1.5 1.5 0 012.121 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 7.5l-2-2" />
            </svg>
            <span className="hidden sm:inline">Bulk Edit</span>
            <span className="sm:hidden">Edit</span>
          </button>
        )}
        {onBulkDuplicate && hasSelection && (
          <button
            onClick={onBulkDuplicate}
            className={secondaryEnabled}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h7a2 2 0 012 2v9" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 9h7a2 2 0 012 2v7a2 2 0 01-2 2H7a2 2 0 01-2-2V11a2 2 0 012-2z" />
            </svg>
            <span className="hidden sm:inline">Duplicate</span>
            <span className="sm:hidden">Copy</span>
          </button>
        )}
        {onBulkUpload && (
          <button
            onClick={onBulkUpload}
            className={secondaryEnabled}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12V4m0 0l-3.5 3.5M12 4l3.5 3.5" />
            </svg>
            <span className="hidden sm:inline">Bulk Upload</span>
            <span className="sm:hidden">Upload</span>
          </button>
        )}
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
