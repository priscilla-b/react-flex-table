import React, { useEffect, useMemo, useState } from 'react'
import SidePanel from './SidePanel'

const REQUIRED_FIELDS = ['company_name', 'contact_name', 'email', 'stage', 'source', 'owner']

function buildInitialValues(options = {}) {
  const today = new Date().toISOString().split('T')[0]
  return {
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    country: '',
    stage: options.stage?.[0] ?? '',
    source: options.source?.[0] ?? '',
    owner: options.owner?.[0] ?? '',
    annual_revenue: '',
    next_action_date: today,
    notes: '',
  }
}

export default function NewRecordDialog({ open, onClose, onSubmit, loading = false, options = {} }) {
  const initialValues = useMemo(() => buildInitialValues(options), [options])
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      setValues(initialValues)
      setErrors({})
      setSubmitError('')
    }
  }, [open, initialValues])

  const handleChange = (field) => (event) => {
    const nextValue = event.target.value
    setValues(prev => ({ ...prev, [field]: nextValue }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = () => {
    const nextErrors = {}
    REQUIRED_FIELDS.forEach(field => {
      if (!values[field] || !values[field].toString().trim()) {
        nextErrors[field] = 'Required'
      }
    })
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = 'Enter a valid email address'
    }
    if (values.annual_revenue !== '' && Number.isNaN(Number(values.annual_revenue))) {
      nextErrors.annual_revenue = 'Enter a number or leave blank'
    }
    return nextErrors
  }

  const handleSubmit = async () => {
    if (loading) return
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    try {
      setSubmitError('')
      await onSubmit?.(values)
    } catch (error) {
      setSubmitError(error?.message || 'Failed to create record')
    }
  }

  return (
    <SidePanel
      open={open}
      onClose={loading ? undefined : onClose}
      title="Create New Lead"
      widthClass="w-full sm:w-[60vw] lg:w-[40vw]"
      actions={[
        { label: 'Cancel', onClick: onClose, variant: 'secondary', disabled: loading },
        { label: loading ? 'Creating...' : 'Create Lead', onClick: handleSubmit, variant: 'primary', disabled: loading },
      ]}
    >
      <div className="">
        <section className="rounded-md border border-slate-200/70 bg-white/80 p-6 shadow-sm shadow-slate-900/5 backdrop-blur-md sm:p-8">
         
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              label="Company *"
              value={values.company_name}
              onChange={handleChange('company_name')}
              error={errors.company_name}
              disabled={loading}
            />
            <Field
              label="Contact Name *"
              value={values.contact_name}
              onChange={handleChange('contact_name')}
              error={errors.contact_name}
              disabled={loading}
            />
            <Field
              type="email"
              label="Email *"
              placeholder="name@company.com"
              value={values.email}
              onChange={handleChange('email')}
              error={errors.email}
              disabled={loading}
            />
            <Field
              label="Phone"
              placeholder="Enter phone number"
              value={values.phone}
              onChange={handleChange('phone')}
              disabled={loading}
            />
            <Field
              label="Country"
              value={values.country}
              onChange={handleChange('country')}
              disabled={loading}
            />
            <SelectField
              label="Stage *"
              value={values.stage}
              onChange={handleChange('stage')}
              options={options.stage || []}
              error={errors.stage}
              disabled={loading}
            />
            <SelectField
              label="Source *"
              value={values.source}
              onChange={handleChange('source')}
              options={options.source || []}
              error={errors.source}
              disabled={loading}
            />
            <SelectField
              label="Owner *"
              value={values.owner}
              onChange={handleChange('owner')}
              options={options.owner || []}
              error={errors.owner}
              disabled={loading}
            />
            <Field
              type="number"
              label="Annual Revenue"
              placeholder="e.g. 150000"
              value={values.annual_revenue}
              onChange={handleChange('annual_revenue')}
              error={errors.annual_revenue}
              disabled={loading}
            />
            <Field
              type="date"
              label="Next Action"
              value={values.next_action_date}
              onChange={handleChange('next_action_date')}
              disabled={loading}
            />
          </div>
          <div className="mt-5">
             <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Notes
              </label>
              <textarea
                className="min-h-[140px] w-full resize-y rounded-md border border-slate-200/70 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                rows={5}
                value={values.notes}
                onChange={handleChange('notes')}
                disabled={loading}
              />
          </div>
        </section>

        {submitError && (
          <div className="rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-700 shadow-sm shadow-red-900/5">
            {submitError}
          </div>
        )}
      </div>
    </SidePanel>
  )
}

function Field({ label, error, type = 'text', ...props }) {
  const base = 'w-full rounded-md border border-slate-200/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/60 disabled:cursor-not-allowed disabled:bg-slate-100/70'
  const errorClass = error ? ' border-red-400 focus:border-red-400 focus:ring-red-300/70' : ''
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</label>
      <input
        type={type}
        className={`${base}${errorClass}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function SelectField({ label, options, error, disabled, ...props }) {
  const withBlank = Array.isArray(options) && options.length > 0 ? options : []
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</label>
      <select
        className={`w-full rounded-md border border-slate-200/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/60 disabled:cursor-not-allowed disabled:bg-slate-100/70${error ? ' border-red-400 focus:border-red-400 focus:ring-red-300/70' : ''}`}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...props}
      >
        <option value="">Select...</option>
        {withBlank.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}



