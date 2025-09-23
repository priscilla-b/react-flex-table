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
      title="Add New Lead"
      description="Provide the details for the new lead. Fields marked with * are required."
      widthClass="max-w-3xl"
      actions={[
        { label: 'Cancel', onClick: onClose, variant: 'secondary', disabled: loading },
        { label: loading ? 'Creating...' : 'Create Lead', onClick: handleSubmit, variant: 'primary', disabled: loading },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Company *"
            value={values.company_name}
            onChange={handleChange('company_name')}
            error={errors.company_name}
            disabled={loading}
          />
          <Field
            label="Contact *"
            value={values.contact_name}
            onChange={handleChange('contact_name')}
            error={errors.contact_name}
            disabled={loading}
          />
          <Field
            type="email"
            label="Email *"
            value={values.email}
            onChange={handleChange('email')}
            error={errors.email}
            disabled={loading}
          />
          <Field
            label="Phone"
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
        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={5}
            value={values.notes}
            onChange={handleChange('notes')}
            disabled={loading}
          />
        </div>
        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}
      </div>
    </SidePanel>
  )
}

function Field({ label, error, type = 'text', ...props }) {
  const base = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const errorClass = error ? ' border-red-500 focus:border-red-500 focus:ring-red-500' : ''
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        className={`${base}${errorClass}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function SelectField({ label, options, error, disabled, ...props }) {
  const withBlank = Array.isArray(options) && options.length > 0 ? options : ['']
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500${error ? ' border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
        disabled={disabled}
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

