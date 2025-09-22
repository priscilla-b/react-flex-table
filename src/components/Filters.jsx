import React, { useEffect, useMemo, useState } from 'react'

const DEFAULT_FILTERS = {
  company: '',
  contact: '',
  email: '',
  country: '',
  stage: '',
  source: '',
  owner: '',
  minRevenue: '',
  maxRevenue: '',
  createdFrom: '',
  createdTo: '',
  nextAfter: '',
  nextBefore: '',
}

function sanitizeFilters(obj) {
  const entries = Object.entries(obj || {})
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)

  return Object.fromEntries(entries)
}

export default function Filters({ filters = {}, onApply, onClear, options = {} }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [draft, setDraft] = useState({ ...DEFAULT_FILTERS })

  const activeCount = useMemo(() => Object.keys(sanitizeFilters(filters)).length, [filters])
  const sanitizedDraft = useMemo(() => sanitizeFilters(draft), [draft])
  const sanitizedApplied = useMemo(() => sanitizeFilters(filters), [filters])
  const hasDraftValues = useMemo(() => Object.keys(sanitizedDraft).length > 0, [sanitizedDraft])
  const isDirty = useMemo(
    () => JSON.stringify(sanitizedDraft) !== JSON.stringify(sanitizedApplied),
    [sanitizedDraft, sanitizedApplied]
  )

  useEffect(() => {
    if (open) {
      setDraft({ ...DEFAULT_FILTERS, ...filters })
    }
  }, [open, filters])

  const updateDraft = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  const handleApply = event => {
    event?.preventDefault()
    if (!isDirty) {
      setOpen(false)
      return
    }

    onApply?.(sanitizedDraft)
    setOpen(false)
  }

  const handleClear = () => {
    setDraft({ ...DEFAULT_FILTERS })
    onClear?.()
  }

  const stageOptions = options.stage || []
  const sourceOptions = options.source || []
  const ownerOptions = options.owner || []

  const buttonClass =
    open || activeCount > 0
      ? 'toolbar-button bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
      : 'toolbar-button bg-gray-100 hover:bg-gray-200 text-gray-700'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={buttonClass}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10m-7 6h4" />
        </svg>
        Filters{activeCount ? ` (${activeCount})` : ''}
      </button>

      {open && (
        <div className="dropdown-menu animate-slide-in min-w-[280px] max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configure Filters</div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  activeTab === 'basic' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600 hover:text-gray-800'
                }`}
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('advanced')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  activeTab === 'advanced'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white text-gray-600 hover:text-gray-800'
                }`}
              >
                Advanced
              </button>
            </div>
          </div>

          <form onSubmit={handleApply} className="space-y-4">
            {activeTab === 'basic' ? (
              <div className="space-y-3">
                <div>
                  <label className="filter-label" htmlFor="filter-company">
                    Company
                  </label>
                  <input
                    id="filter-company"
                    value={draft.company}
                    onChange={e => updateDraft('company', e.target.value)}
                    placeholder="Contains..."
                    className="filter-input"
                    type="text"
                  />
                </div>

                <div>
                  <label className="filter-label" htmlFor="filter-contact">
                    Contact
                  </label>
                  <input
                    id="filter-contact"
                    value={draft.contact}
                    onChange={e => updateDraft('contact', e.target.value)}
                    placeholder="Contains..."
                    className="filter-input"
                    type="text"
                  />
                </div>

                <div>
                  <label className="filter-label" htmlFor="filter-email">
                    Email
                  </label>
                  <input
                    id="filter-email"
                    value={draft.email}
                    onChange={e => updateDraft('email', e.target.value)}
                    placeholder="Contains..."
                    className="filter-input"
                    type="text"
                  />
                </div>

                <div>
                  <label className="filter-label" htmlFor="filter-country">
                    Country
                  </label>
                  <input
                    id="filter-country"
                    value={draft.country}
                    onChange={e => updateDraft('country', e.target.value)}
                    placeholder="Contains..."
                    className="filter-input"
                    type="text"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="filter-label" htmlFor="filter-stage">
                      Stage
                    </label>
                    <select
                      id="filter-stage"
                      value={draft.stage}
                      onChange={e => updateDraft('stage', e.target.value)}
                      className="filter-input"
                    >
                      <option value="">Any</option>
                      {stageOptions.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="filter-label" htmlFor="filter-source">
                      Source
                    </label>
                    <select
                      id="filter-source"
                      value={draft.source}
                      onChange={e => updateDraft('source', e.target.value)}
                      className="filter-input"
                    >
                      <option value="">Any</option>
                      {sourceOptions.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="filter-label" htmlFor="filter-owner">
                    Owner
                  </label>
                  <select
                    id="filter-owner"
                    value={draft.owner}
                    onChange={e => updateDraft('owner', e.target.value)}
                    className="filter-input"
                  >
                    <option value="">Any</option>
                    {ownerOptions.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="filter-label">Annual Revenue</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={draft.minRevenue}
                      onChange={e => updateDraft('minRevenue', e.target.value)}
                      placeholder="Min"
                      className="filter-input"
                      type="number"
                      min="0"
                    />
                    <input
                      value={draft.maxRevenue}
                      onChange={e => updateDraft('maxRevenue', e.target.value)}
                      placeholder="Max"
                      className="filter-input"
                      type="number"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <div className="filter-label">Created Date</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={draft.createdFrom}
                      onChange={e => updateDraft('createdFrom', e.target.value)}
                      className="filter-input"
                      type="date"
                    />
                    <input
                      value={draft.createdTo}
                      onChange={e => updateDraft('createdTo', e.target.value)}
                      className="filter-input"
                      type="date"
                    />
                  </div>
                </div>

                <div>
                  <div className="filter-label">Next Action Date</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={draft.nextAfter}
                      onChange={e => updateDraft('nextAfter', e.target.value)}
                      className="filter-input"
                      type="date"
                    />
                    <input
                      value={draft.nextBefore}
                      onChange={e => updateDraft('nextBefore', e.target.value)}
                      className="filter-input"
                      type="date"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={!activeCount && !hasDraftValues}
              >
                Clear all
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="toolbar-button text-gray-600 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`toolbar-button toolbar-button-primary px-4 ${
                    isDirty ? '' : 'opacity-70 cursor-not-allowed'
                  }`}
                  disabled={!isDirty}
                >
                  Apply filters
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}