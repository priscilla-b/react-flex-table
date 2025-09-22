import React, { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'

function resolveHeaderLabel(column) {
  if (!column) return ''
  if (typeof column.header === 'string') return column.header
  if (typeof column.header === 'function') return column.accessorKey || 'Column'
  return column.accessorKey || String(column.id || '')
}

export default function BulkEditDialog({ open, onClose, columns = [], selectionCount = 0, onConfirm, loading = false }) {
  const editableColumns = useMemo(
    () => columns.filter(col => col && col.editable),
    [columns]
  )
  const [columnId, setColumnId] = useState(editableColumns[0]?.accessorKey || '')
  const [rawValue, setRawValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const firstColumn = editableColumns[0]
    setColumnId(firstColumn?.accessorKey || '')
    setRawValue('')
    setError('')
  }, [open, editableColumns])

  useEffect(() => {
    setError('')
  }, [columnId, rawValue])

  const activeColumn = useMemo(
    () => editableColumns.find(col => col.accessorKey === columnId),
    [editableColumns, columnId]
  )

  const editorType = activeColumn?.editor?.type || 'text'
  const options = useMemo(() => (Array.isArray(activeColumn?.editor?.options) ? activeColumn.editor.options : []), [activeColumn])
  const allowNull = activeColumn?.editor?.allowNull !== false
  const isRequired = Boolean(activeColumn?.required) || !allowNull

  useEffect(() => {
    if (!open) return
    if (!activeColumn) {
      setRawValue('')
      return
    }
    if (editorType === 'select') {
      const initial = allowNull ? '' : (options[0] ?? '')
      setRawValue(initial)
    } else {
      setRawValue('')
    }
  }, [columnId, activeColumn, editorType, allowNull, options, open])

  const handleSubmit = () => {
    if (!columnId || !selectionCount || loading) return
    const editor = activeColumn?.editor
    let nextValue = rawValue

    if (editor?.type === 'number') {
      if (rawValue === '') {
        if (isRequired) {
          setError('This field is required.')
          return
        }
        nextValue = null
      } else {
        const parsed = Number(rawValue)
        if (Number.isNaN(parsed)) {
          setError('Enter a valid number.')
          return
        }
        nextValue = parsed
      }
    } else if (editor?.type === 'date') {
      if (!rawValue) {
        if (isRequired) {
          setError('This field is required.')
          return
        }
        nextValue = null
      } else {
        nextValue = rawValue
      }
    } else if (editor?.type === 'select') {
      if (!rawValue) {
        if (allowNull) {
          nextValue = null
        } else {
          setError('Choose a value to apply.')
          return
        }
      } else {
        nextValue = rawValue
      }
    } else {
      if (!rawValue) {
        if (isRequired) {
          setError('This field is required.')
          return
        }
        nextValue = null
      } else {
        nextValue = rawValue
      }
    }

    onConfirm?.(columnId, nextValue)
  }

  const renderValueInput = () => {
    if (!activeColumn) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          Choose a column to configure the bulk edit.
        </div>
      )
    }

    if (editorType === 'select') {
      return (
        <div className="space-y-2">
          <select
            value={rawValue}
            onChange={event => setRawValue(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allowNull && <option value="">Clear value</option>}
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">{allowNull ? 'Choose a value or pick "Clear value" to remove it.' : 'Choose the value to apply to every selected row.'}</p>
        </div>
      )
    }

    const inputType = editorType === 'number' ? 'number' : editorType === 'date' ? 'date' : 'text'

    return (
      <div className="space-y-2">
        <input
          type={inputType}
          value={rawValue}
          onChange={event => setRawValue(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={isRequired ? 'Enter the new value' : 'Leave blank to clear the value'}
        />
        <p className="text-xs text-gray-500">{isRequired ? 'This field cannot be blank.' : 'Leave blank to clear this field across all selected rows.'}</p>
      </div>
    )
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Bulk Edit"
      description={selectionCount ? `Apply changes to ${selectionCount} selected row${selectionCount === 1 ? '' : 's'}.` : 'Select at least one row to enable bulk editing.'}
      actions={[
        { label: 'Cancel', onClick: onClose, variant: 'secondary', disabled: loading },
        { label: 'Apply Changes', onClick: handleSubmit, variant: 'primary', disabled: loading || !selectionCount || !columnId }
      ]}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Column to update</label>
          <select
            value={columnId}
            onChange={event => setColumnId(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!selectionCount || editableColumns.length === 0}
          >
            {editableColumns.length === 0 && <option value="">No editable columns found</option>}
            {editableColumns.map(column => (
              <option key={column.accessorKey} value={column.accessorKey}>
                {resolveHeaderLabel(column)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">New value</label>
          {renderValueInput()}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!selectionCount && (
          <p className="text-xs text-gray-500">Select one or more rows in the table to enable bulk editing.</p>
        )}
      </div>
    </Modal>
  )
}


