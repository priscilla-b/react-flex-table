import React, { useEffect, useState } from 'react'
import Modal from './Modal'

export default function BulkDuplicateDialog({ open, onClose, selectionCount = 0, onConfirm, loading = false }) {
  const [copiesPerRecord, setCopiesPerRecord] = useState('1')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState(' (Copy)')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setCopiesPerRecord('1')
    setPrefix('')
    setSuffix(' (Copy)')
    setError('')
  }, [open])

  useEffect(() => {
    setError('')
  }, [copiesPerRecord, prefix, suffix])

  const handleSubmit = () => {
    if (!selectionCount || loading) return
    const parsedCopies = Number(copiesPerRecord)
    if (!Number.isInteger(parsedCopies) || parsedCopies < 1) {
      setError('Enter a whole number of copies (at least 1).')
      return
    }
    if (parsedCopies > 25) {
      setError('Limit copies per record to 25 or fewer to keep things snappy.')
      return
    }

    onConfirm?.({
      copies: parsedCopies,
      prefix: prefix || '',
      suffix: suffix || ''
    })
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Bulk Duplicate"
      description={selectionCount ? `Create duplicates for ${selectionCount} selected row${selectionCount === 1 ? '' : 's'}.` : 'Select rows in the table before duplicating.'}
      actions={[
        { label: 'Cancel', onClick: onClose, variant: 'secondary', disabled: loading },
        { label: 'Duplicate', onClick: handleSubmit, variant: 'primary', disabled: loading || !selectionCount }
      ]}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Copies per record</label>
          <input
            type="number"
            min="1"
            max="25"
            value={copiesPerRecord}
            onChange={event => setCopiesPerRecord(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Creates this many duplicates for each selected row.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Prefix (optional)</label>
            <input
              type="text"
              placeholder="e.g. Copy of"
              value={prefix}
              onChange={event => setPrefix(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">Adds text before the primary label (company name).</p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Suffix (optional)</label>
            <input
              type="text"
              placeholder="e.g. (Copy)"
              value={suffix}
              onChange={event => setSuffix(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">Appends text after the primary label.</p>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
