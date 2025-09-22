import React, { useEffect, useMemo, useState } from 'react'

const SIMPLE_FILTER_TEMPLATE = {
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

const FIELD_CONFIG = [
  { key: 'company', label: 'Company', column: 'company_name', type: 'text' },
  { key: 'contact', label: 'Contact', column: 'contact_name', type: 'text' },
  { key: 'email', label: 'Email', column: 'email', type: 'text' },
  { key: 'country', label: 'Country', column: 'country', type: 'text' },
  { key: 'stage', label: 'Stage', column: 'stage', type: 'select', optionKey: 'stage' },
  { key: 'source', label: 'Source', column: 'source', type: 'select', optionKey: 'source' },
  { key: 'owner', label: 'Owner', column: 'owner', type: 'select', optionKey: 'owner' },
  { key: 'annual_revenue', label: 'Annual Revenue', column: 'annual_revenue', type: 'number' },
  { key: 'created_at', label: 'Created Date', column: 'created_at', type: 'date' },
  { key: 'next_action_date', label: 'Next Action Date', column: 'next_action_date', type: 'date' },
]

const FIELD_MAP = Object.fromEntries(FIELD_CONFIG.map(cfg => [cfg.key, cfg]))

const OPERATORS_BY_TYPE = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not Contains' },
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is Not' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
  ],
  select: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is Not' },
  ],
  number: [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater Or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less Or Equal' },
  ],
  date: [
    { value: 'on', label: 'On' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'on_or_before', label: 'On Or Before' },
    { value: 'on_or_after', label: 'On Or After' },
  ],
}

const DEFAULT_OPERATOR_BY_TYPE = {
  text: 'contains',
  select: 'is',
  number: 'eq',
  date: 'on',
}

const LOGIC_OPTIONS = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
]

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const createEmptySimpleFilters = () => ({ ...SIMPLE_FILTER_TEMPLATE })

export const createDefaultAdvancedState = () => ({
  conditions: [],
})

export const createDefaultFilterState = () => ({
  mode: 'simple',
  simple: {},
  advanced: createDefaultAdvancedState(),
})

export function sanitizeSimpleFilters(input = {}) {
  if (!input || typeof input !== 'object') return {}

  const entries = Object.entries(input)
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)

  return Object.fromEntries(entries)
}

function getFieldConfig(fieldKey) {
  return FIELD_MAP[fieldKey] || null
}

function getDefaultOperator(fieldKey) {
  const cfg = getFieldConfig(fieldKey)
  if (!cfg) return 'contains'
  return DEFAULT_OPERATOR_BY_TYPE[cfg.type] || 'contains'
}

function normalizeJoin(joinValue, isFirst) {
  if (isFirst) return null
  return joinValue === 'OR' ? 'OR' : 'AND'
}

function normalizeConditionShape(condition, index, legacyLogic = 'AND') {
  const field = condition?.field || condition?.key
  const cfg = getFieldConfig(field)
  if (!cfg) return null

  const operator = condition?.operator || (condition?.negate
    ? (cfg.type === 'text' ? 'not_contains' : cfg.type === 'select' ? 'is_not' : 'neq')
    : getDefaultOperator(field))

  const value = condition?.value ?? ''
  const join = normalizeJoin(condition?.join, index === 0 ? true : false) ?? (index === 0 ? null : legacyLogic)

  return {
    id: condition?.id || generateId(),
    field,
    operator,
    value: typeof value === 'string' ? value : String(value ?? ''),
    join,
  }
}

export function sanitizeAdvancedFilters(input = {}) {
  if (!input || typeof input !== 'object') {
    return { conditions: [] }
  }

  const rawConditions = Array.isArray(input.conditions) ? input.conditions : []
  const legacyLogic = input.logic === 'OR' ? 'OR' : 'AND'

  const normalized = rawConditions
    .map((condition, index) => normalizeConditionShape(condition, index, legacyLogic))
    .filter(Boolean)

  return { conditions: normalized }
}

export function sanitizeFilterState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      mode: 'simple',
      simple: sanitizeSimpleFilters(input || {}),
      advanced: createDefaultAdvancedState(),
    }
  }

  if (!('mode' in input) && !('simple' in input) && !('advanced' in input)) {
    return {
      mode: 'simple',
      simple: sanitizeSimpleFilters(input),
      advanced: createDefaultAdvancedState(),
    }
  }

  const simple = sanitizeSimpleFilters(input.simple || {})
  const advanced = sanitizeAdvancedFilters(input.advanced || {})
  const mode = input.mode === 'advanced' ? 'advanced' : 'simple'

  return {
    mode,
    simple,
    advanced,
  }
}

export function countActiveFilters(state) {
  const safe = sanitizeFilterState(state)
  const simpleCount = Object.keys(safe.simple || {}).length
  const advancedCount = safe.advanced?.conditions?.length || 0
  return simpleCount + advancedCount
}

function getFieldOptions(fieldKey, options) {
  const cfg = getFieldConfig(fieldKey)
  if (!cfg || cfg.type !== 'select') return []
  const optionKey = cfg.optionKey
  return Array.isArray(options?.[optionKey]) ? options[optionKey] : []
}

function getOperatorsForField(fieldKey) {
  const cfg = getFieldConfig(fieldKey)
  if (!cfg) return OPERATORS_BY_TYPE.text
  return OPERATORS_BY_TYPE[cfg.type] || OPERATORS_BY_TYPE.text
}

function createConditionTemplate(prevJoin = null) {
  const firstField = FIELD_CONFIG[0]?.key || 'company'
  const operator = getDefaultOperator(firstField)
  return {
    id: generateId(),
    field: firstField,
    operator,
    value: '',
    join: prevJoin,
  }
}

function getInputTypeForField(fieldKey) {
  const cfg = getFieldConfig(fieldKey)
  return cfg?.type || 'text'
}

function formatValueForOperator(fieldKey, operator, value) {
  const type = getInputTypeForField(fieldKey)
  if (type === 'number' && value !== '' && value !== null && value !== undefined) {
    return Number(value)
  }
  return value
}

export default function Filters({ filters = createDefaultFilterState(), onApply, onClear, options = {} }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [simpleDraft, setSimpleDraft] = useState(createEmptySimpleFilters())
  const [advancedDraft, setAdvancedDraft] = useState(createDefaultAdvancedState())

  const appliedState = useMemo(() => sanitizeFilterState(filters), [filters])

  useEffect(() => {
    if (open) {
      setSimpleDraft({ ...createEmptySimpleFilters(), ...appliedState.simple })
      setAdvancedDraft({
        conditions: appliedState.advanced.conditions.map(cond => ({ ...cond }))
      })
      setActiveTab(appliedState.mode === 'advanced' ? 'advanced' : 'basic')
    }
  }, [open, appliedState])

  const sanitizedSimpleDraft = useMemo(() => sanitizeSimpleFilters(simpleDraft), [simpleDraft])
  const sanitizedAdvancedDraft = useMemo(() => sanitizeAdvancedFilters(advancedDraft), [advancedDraft])

  const pendingState = useMemo(() => ({
    mode: activeTab === 'advanced' ? 'advanced' : 'simple',
    simple: sanitizedSimpleDraft,
    advanced: sanitizedAdvancedDraft,
  }), [activeTab, sanitizedSimpleDraft, sanitizedAdvancedDraft])

  const appliedAdvanced = appliedState.advanced?.conditions || []
  const activeCount = useMemo(() => countActiveFilters(appliedState), [appliedState])

  const isDirty = useMemo(
    () => JSON.stringify(pendingState) !== JSON.stringify(appliedState),
    [pendingState, appliedState]
  )

  const hasDraftValues = useMemo(() => {
    const simpleValues = Object.keys(sanitizedSimpleDraft).length > 0
    const advancedValues = sanitizedAdvancedDraft.conditions.some(cond => (cond.value ?? '').toString().trim() !== '')
    return simpleValues || advancedValues
  }, [sanitizedSimpleDraft, sanitizedAdvancedDraft])

  const buttonClass =
    open || activeCount > 0
      ? 'toolbar-button bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
      : 'toolbar-button bg-gray-100 hover:bg-gray-200 text-gray-700'

  const updateSimpleDraft = (key, value) => {
    setSimpleDraft(prev => ({ ...prev, [key]: value }))
  }

  const updateConditionField = (id, fieldKey) => {
    const cfg = getFieldConfig(fieldKey)
    if (!cfg) return
    setAdvancedDraft(prev => ({
      ...prev,
      conditions: prev.conditions.map(cond =>
        cond.id === id
          ? {
              ...cond,
              field: fieldKey,
              operator: getDefaultOperator(fieldKey),
              value: '',
            }
          : cond
      ),
    }))
  }

  const updateConditionOperator = (id, operator) => {
    setAdvancedDraft(prev => ({
      ...prev,
      conditions: prev.conditions.map(cond =>
        cond.id === id ? { ...cond, operator } : cond
      ),
    }))
  }

  const updateConditionValue = (id, value) => {
    setAdvancedDraft(prev => ({
      ...prev,
      conditions: prev.conditions.map(cond =>
        cond.id === id ? { ...cond, value } : cond
      ),
    }))
  }

  const updateConditionJoin = (id, join) => {
    setAdvancedDraft(prev => ({
      ...prev,
      conditions: prev.conditions.map(cond =>
        cond.id === id ? { ...cond, join: join === 'OR' ? 'OR' : 'AND' } : cond
      ),
    }))
  }

  const removeCondition = id => {
    setAdvancedDraft(prev => ({
      ...prev,
      conditions: prev.conditions
        .filter(cond => cond.id !== id)
        .map((cond, index) => ({
          ...cond,
          join: index === 0 ? null : (cond.join || 'AND'),
        })),
    }))
  }

  const addCondition = () => {
    setAdvancedDraft(prev => {
      const nextJoin = prev.conditions.length === 0 ? null : 'AND'
      return {
        ...prev,
        conditions: [...prev.conditions, createConditionTemplate(nextJoin)],
      }
    })
  }

  const handleApply = event => {
    event?.preventDefault()
    if (!isDirty) {
      setOpen(false)
      return
    }

    onApply?.(pendingState)
    setOpen(false)
  }

  const handleClear = () => {
    setSimpleDraft(createEmptySimpleFilters())
    setAdvancedDraft(createDefaultAdvancedState())
    onClear?.()
  }

  const renderValueInput = condition => {
    const cfg = getFieldConfig(condition.field)
    if (!cfg) {
      return (
        <input
          className="filter-input"
          type="text"
          value={condition.value}
          onChange={e => updateConditionValue(condition.id, e.target.value)}
          placeholder="Enter value"
        />
      )
    }

    if (cfg.type === 'select') {
      const items = getFieldOptions(condition.field, options)
      return (
        <select
          className="filter-input"
          value={condition.value}
          onChange={e => updateConditionValue(condition.id, e.target.value)}
        >
          <option value="">Select value</option>
          {items.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }

    if (cfg.type === 'number') {
      return (
        <input
          className="filter-input"
          type="number"
          value={condition.value}
          onChange={e => updateConditionValue(condition.id, e.target.value)}
          placeholder="Enter number"
        />
      )
    }

    if (cfg.type === 'date') {
      return (
        <input
          className="filter-input"
          type="date"
          value={condition.value}
          onChange={e => updateConditionValue(condition.id, e.target.value)}
        />
      )
    }

    return (
      <input
        className="filter-input"
        type="text"
        value={condition.value}
        onChange={e => updateConditionValue(condition.id, e.target.value)}
        placeholder="Enter text"
      />
    )
  }

  const renderAdvancedConditions = () => (
    <div className="space-y-4">
      {advancedDraft.conditions.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4 text-center">
          No advanced conditions yet
        </div>
      ) : (
        advancedDraft.conditions.map((condition, index) => {
          const cfg = getFieldConfig(condition.field)
          const operators = getOperatorsForField(condition.field)
          return (
            <div key={condition.id} className="border border-gray-200 rounded-lg bg-white">
              {index > 0 && (
                <div className="px-3 pt-3">
                  <label className="filter-label mb-2">Logic</label>
                  <select
                    className="filter-input"
                    value={condition.join || 'AND'}
                    onChange={e => updateConditionJoin(condition.id, e.target.value)}
                  >
                    {LOGIC_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="filter-label">Column</label>
                    <select
                      className="filter-input"
                      value={condition.field}
                      onChange={e => updateConditionField(condition.id, e.target.value)}
                    >
                      {FIELD_CONFIG.map(option => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="filter-label">Condition</label>
                    <select
                      className="filter-input"
                      value={condition.operator}
                      onChange={e => updateConditionOperator(condition.id, e.target.value)}
                    >
                      {operators.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="filter-label">Value</label>
                    {renderValueInput(condition)}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:text-red-600"
                    onClick={() => removeCondition(condition.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}

      <button
        type="button"
        onClick={addCondition}
        className="toolbar-button text-blue-600 bg-blue-50 hover:bg-blue-100 px-3"
      >
        + Add condition
      </button>
    </div>
  )

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
        <div className="dropdown-menu animate-slide-in min-w-[320px] max-w-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configure Filters</div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  activeTab === 'basic'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white text-gray-600 hover:text-gray-800'
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
                  <label className="filter-label" htmlFor="filter-company">Company</label>
                  <input
                    id="filter-company"
                    value={simpleDraft.company}
                    onChange={e => updateSimpleDraft('company', e.target.value)}
                    placeholder="Contains..."
                    className="filter-input"
                    type="text"
                  />
                </div>
                <div>
                  <label className="filter-label" htmlFor="filter-contact">Contact</label>
                  <input
                    id="filter-contact"
                    value={simpleDraft.contact}
                    onChange={e => updateSimpleDraft('contact', e.target.value)}
                    placeholder="Contains..."
                    className="filter-input"
                    type="text"
                  />
                </div>
                <div>
                  <label className="filter-label" htmlFor="filter-email">Email</label>
                  <input
                    id="filter-email"
                    value={simpleDraft.email}
                    onChange={e => updateSimpleDraft('email', e.target.value)}
                    placeholder="Contains..."
                    className="filter-input"
                    type="text"
                  />
                </div>
                <div>
                  <label className="filter-label" htmlFor="filter-country">Country</label>
                  <input
                    id="filter-country"
                    value={simpleDraft.country}
                    onChange={e => updateSimpleDraft('country', e.target.value)}
                    placeholder="Contains..."
                    className="filter-input"
                    type="text"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="filter-label" htmlFor="filter-stage">Stage</label>
                    <select
                      id="filter-stage"
                      value={simpleDraft.stage}
                      onChange={e => updateSimpleDraft('stage', e.target.value)}
                      className="filter-input"
                    >
                      <option value="">Any</option>
                      {getFieldOptions('stage', options).map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="filter-label" htmlFor="filter-source">Source</label>
                    <select
                      id="filter-source"
                      value={simpleDraft.source}
                      onChange={e => updateSimpleDraft('source', e.target.value)}
                      className="filter-input"
                    >
                      <option value="">Any</option>
                      {getFieldOptions('source', options).map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              renderAdvancedConditions()
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={!hasDraftValues && activeCount === 0}
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