/* eslint-env node */
import express from 'express'
import cors from 'cors'
import db from './db.js'

const app = express()
app.use(cors())
app.use(express.json())

const ALLOWED_SORT = new Set([
  'id',
  'company_name',
  'contact_name',
  'email',
  'country',
  'stage',
  'source',
  'owner',
  'annual_revenue',
  'next_action_date',
  'created_at'
])

const EDITABLE_COLUMNS = new Set([
  'company_name',
  'contact_name',
  'email',
  'phone',
  'country',
  'stage',
  'source',
  'owner',
  'annual_revenue',
  'next_action_date',
  'notes'
])

const STAGES = ['Prospect','Qualified','Proposal','Won','Lost']
const SOURCES = ['Referral','Ads','Events','Outbound','Organic']
const NOT_NULL_COLUMNS = new Set(['company_name','contact_name','email','stage','source','owner'])
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const FIELD_METADATA = {
  company: { column: 'company_name', type: 'text' },
  contact: { column: 'contact_name', type: 'text' },
  email: { column: 'email', type: 'text' },
  country: { column: 'country', type: 'text' },
  stage: { column: 'stage', type: 'select' },
  source: { column: 'source', type: 'select' },
  owner: { column: 'owner', type: 'select' },
  annual_revenue: { column: 'annual_revenue', type: 'number' },
  created_at: { column: 'created_at', type: 'date' },
  next_action_date: { column: 'next_action_date', type: 'date' },
}

function sanitizeSimpleFilters(raw = {}) {
  if (!raw || typeof raw !== 'object') return {}
  const result = {}
  Object.entries(raw).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed !== '') result[key] = trimmed
    } else if (value !== '') {
      result[key] = value
    }
  })
  return result
}

function defaultOperatorForField(fieldKey, negate = false) {
  const meta = FIELD_METADATA[fieldKey]
  if (!meta) return 'contains'
  if (meta.type === 'select') return negate ? 'is_not' : 'is'
  if (meta.type === 'number') return negate ? 'neq' : 'eq'
  if (meta.type === 'date') return negate ? 'before' : 'on'
  return negate ? 'not_contains' : 'contains'
}

function normalizeConditionShape(condition, index, legacyLogic = 'AND') {
  const field = condition?.field || condition?.key
  const meta = FIELD_METADATA[field]
  if (!meta) return null
  const operator = condition?.operator || defaultOperatorForField(field, condition?.negate)
  const value = condition?.value ?? ''
  const join = index === 0 ? null : (condition?.join === 'OR' ? 'OR' : condition?.join === 'AND' ? 'AND' : legacyLogic)
  return {
    id: condition?.id || `${field}-${index}-${Date.now()}`,
    field,
    operator,
    value: typeof value === 'string' ? value : String(value ?? ''),
    join,
  }
}

function normalizeAdvancedConditions(input = {}) {
  if (!input || typeof input !== 'object') return []
  const rawConditions = Array.isArray(input.conditions) ? input.conditions : []
  const legacyLogic = input.logic === 'OR' ? 'OR' : 'AND'
  return rawConditions
    .map((condition, index) => normalizeConditionShape(condition, index, legacyLogic))
    .filter(Boolean)
}

function normalizeFilterPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { mode: 'simple', simple: {}, advanced: { conditions: [] } }
  }

  if ('mode' in payload || 'simple' in payload || 'advanced' in payload) {
    const mode = payload.mode === 'advanced' ? 'advanced' : 'simple'
    const simple = sanitizeSimpleFilters(payload.simple || {})
    const advanced = { conditions: normalizeAdvancedConditions(payload.advanced || {}) }
    return { mode, simple, advanced }
  }

  return { mode: 'simple', simple: sanitizeSimpleFilters(payload), advanced: { conditions: [] } }
}

function applySimpleFilters(where, params, filters = {}) {
  const simple = sanitizeSimpleFilters(filters)

  if (simple.company) { where.push('company_name LIKE @company'); params.company = `%${simple.company}%` }
  if (simple.contact) { where.push('contact_name LIKE @contact'); params.contact = `%${simple.contact}%` }
  if (simple.email) { where.push('email LIKE @email'); params.email = `%${simple.email}%` }
  if (simple.country) { where.push('country LIKE @country'); params.country = `%${simple.country}%` }

  if (simple.stage) { where.push('stage = @stage'); params.stage = simple.stage }
  if (simple.source) { where.push('source = @source'); params.source = simple.source }
  if (simple.owner) { where.push('owner = @owner'); params.owner = simple.owner }

  if (simple.minRevenue !== undefined) {
    const value = Number(simple.minRevenue)
    if (Number.isFinite(value)) {
      where.push('annual_revenue >= @minRevenue')
      params.minRevenue = value
    }
  }

  if (simple.maxRevenue !== undefined) {
    const value = Number(simple.maxRevenue)
    if (Number.isFinite(value)) {
      where.push('annual_revenue <= @maxRevenue')
      params.maxRevenue = value
    }
  }

  if (simple.createdFrom) { where.push('date(created_at) >= date(@createdFrom)'); params.createdFrom = simple.createdFrom }
  if (simple.createdTo) { where.push('date(created_at) <= date(@createdTo)'); params.createdTo = simple.createdTo }
  if (simple.nextBefore) { where.push('date(next_action_date) <= date(@nextBefore)'); params.nextBefore = simple.nextBefore }
  if (simple.nextAfter) { where.push('date(next_action_date) >= date(@nextAfter)'); params.nextAfter = simple.nextAfter }
}

function coerceBulkEditValue(column, raw) {
  let value = raw
  if (value === undefined) value = null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    value = trimmed === '' ? null : trimmed
  }

  if (column === 'annual_revenue') {
    if (value === null) return { ok: true, value: null }
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) {
      return { ok: false, error: 'Enter a valid number.' }
    }
    return { ok: true, value: numeric }
  }

  if (column === 'next_action_date') {
    if (value === null) return { ok: true, value: null }
    const asString = String(value)
    if (!DATE_PATTERN.test(asString)) {
      return { ok: false, error: 'Provide a date in YYYY-MM-DD format.' }
    }
    return { ok: true, value: asString }
  }

  if (column === 'stage') {
    if (value === null) {
      return { ok: false, error: 'Stage cannot be empty.' }
    }
    const normalized = String(value).trim()
    if (!STAGES.includes(normalized)) {
      return { ok: false, error: 'Invalid stage selection.' }
    }
    return { ok: true, value: normalized }
  }

  if (column === 'source') {
    if (value === null) {
      return { ok: false, error: 'Source cannot be empty.' }
    }
    const normalized = String(value).trim()
    if (!SOURCES.includes(normalized)) {
      return { ok: false, error: 'Invalid source selection.' }
    }
    return { ok: true, value: normalized }
  }

  if (NOT_NULL_COLUMNS.has(column)) {
    if (value === null) {
      return { ok: false, error: 'This field is required.' }
    }
    const normalized = String(value).trim()
    if (!normalized) {
      return { ok: false, error: 'This field is required.' }
    }
    return { ok: true, value: normalized }
  }

  if (value === null) {
    return { ok: true, value: null }
  }

  return { ok: true, value: String(value).trim() || null }
}

function formatDuplicateName(base, { prefix = '', suffix = '', index = 0, copies = 1 } = {}) {
  const trimmedBase = (base ?? '').toString().trim() || 'Untitled Lead'
  const pref = prefix ? prefix.toString().trim() : ''
  const suff = suffix ? suffix.toString() : ''
  let name = trimmedBase
  if (pref) {
    name = `${pref} ${name}`.trim()
  }
  if (suff) {
    name = `${name}${suff}`
  }
  if (copies > 1) {
    name = `${name} ${index + 1}`.trim()
  }
  return name
}

function buildAdvancedCondition(condition, index) {
  const fieldMeta = FIELD_METADATA[condition.field]
  if (!fieldMeta) return null

  const paramName = `adv_${index}_${condition.field}`
  const params = {}
  const value = condition.value?.trim?.() ?? ''
  if (value === '') return null

  let sql = ''

  switch (fieldMeta.type) {
    case 'text': {
      if (condition.operator === 'contains') {
        params[paramName] = `%${value}%`
        sql = `${fieldMeta.column} LIKE @${paramName}`
      } else if (condition.operator === 'not_contains') {
        params[paramName] = `%${value}%`
        sql = `NOT (${fieldMeta.column} LIKE @${paramName})`
      } else if (condition.operator === 'is') {
        params[paramName] = value
        sql = `${fieldMeta.column} = @${paramName}`
      } else if (condition.operator === 'is_not') {
        params[paramName] = value
        sql = `${fieldMeta.column} <> @${paramName}`
      } else if (condition.operator === 'starts_with') {
        params[paramName] = `${value}%`
        sql = `${fieldMeta.column} LIKE @${paramName}`
      } else if (condition.operator === 'ends_with') {
        params[paramName] = `%${value}`
        sql = `${fieldMeta.column} LIKE @${paramName}`
      } else {
        params[paramName] = `%${value}%`
        sql = `${fieldMeta.column} LIKE @${paramName}`
      }
      break
    }
    case 'select': {
      params[paramName] = value
      if (condition.operator === 'is_not') {
        sql = `${fieldMeta.column} <> @${paramName}`
      } else {
        sql = `${fieldMeta.column} = @${paramName}`
      }
      break
    }
    case 'number': {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return null
      params[paramName] = numeric
      switch (condition.operator) {
        case 'neq':
          sql = `${fieldMeta.column} <> @${paramName}`
          break
        case 'gt':
          sql = `${fieldMeta.column} > @${paramName}`
          break
        case 'gte':
          sql = `${fieldMeta.column} >= @${paramName}`
          break
        case 'lt':
          sql = `${fieldMeta.column} < @${paramName}`
          break
        case 'lte':
          sql = `${fieldMeta.column} <= @${paramName}`
          break
        case 'eq':
        default:
          sql = `${fieldMeta.column} = @${paramName}`
          break
      }
      break
    }
    case 'date': {
      params[paramName] = value
      switch (condition.operator) {
        case 'before':
          sql = `date(${fieldMeta.column}) < date(@${paramName})`
          break
        case 'after':
          sql = `date(${fieldMeta.column}) > date(@${paramName})`
          break
        case 'on_or_before':
          sql = `date(${fieldMeta.column}) <= date(@${paramName})`
          break
        case 'on_or_after':
          sql = `date(${fieldMeta.column}) >= date(@${paramName})`
          break
        case 'on':
        default:
          sql = `date(${fieldMeta.column}) = date(@${paramName})`
          break
      }
      break
    }
    default:
      return null
  }

  return { sql, params }
}

function buildAdvancedFiltersClause(advanced = {}) {
  const conditions = Array.isArray(advanced.conditions) ? advanced.conditions : []
  if (!conditions.length) return null

  const pieces = []
  const params = {}

  conditions.forEach((condition, index) => {
    const result = buildAdvancedCondition(condition, index)
    if (!result) return
    Object.assign(params, result.params)
    pieces.push({ join: index === 0 ? null : (condition.join === 'OR' ? 'OR' : 'AND'), sql: result.sql })
  })

  if (!pieces.length) return null

  const combined = pieces.reduce((acc, piece, index) => {
    if (index === 0) return piece.sql
    const join = piece.join || 'AND'
    return `${acc} ${join} ${piece.sql}`
  }, '')

  const wrapped = pieces.length > 1 ? `(${combined})` : combined
  return { sql: wrapped, params }
}

app.get('/api/leads', (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1)
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '25', 10), 1), 200)
  const sort = ALLOWED_SORT.has(req.query.sort) ? req.query.sort : 'id'
  const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC'

  let rawFilters = {}
  if (req.query.filters) {
    try {
      rawFilters = JSON.parse(req.query.filters)
    } catch (err) {
      console.warn('Invalid filters payload', err)
    }
  }

  const { mode, simple, advanced } = normalizeFilterPayload(rawFilters)

  const where = []
  const params = {}

  applySimpleFilters(where, params, simple)

  if (mode === 'advanced') {
    const advancedResult = buildAdvancedFiltersClause(advanced)
    if (advancedResult) {
      where.push(advancedResult.sql)
      Object.assign(params, advancedResult.params)
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const total = db.prepare(`SELECT COUNT(*) AS t FROM leads ${whereSql}`).get(params).t

  const sql = `
SELECT id, company_name, contact_name, email, phone, country, stage, source, owner,
annual_revenue, next_action_date, created_at, tags
FROM leads
${whereSql}
ORDER BY ${sort} ${dir}
LIMIT @limit OFFSET @offset
`

  const rows = db.prepare(sql).all({ ...params, limit: pageSize, offset: (page - 1) * pageSize })

  res.json({ rows, total })
})

app.patch('/api/leads/:id', (req, res) => {
  const id = +req.params.id
  const allowed = ['company_name','contact_name','email','phone','country','stage','source','owner','annual_revenue','next_action_date','notes','tags']
  const fields = Object.keys(req.body).filter(k => allowed.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No updatable fields' })

  const sets = fields.map(f => `${f}=@${f}`).join(', ')
  const stmt = db.prepare(`UPDATE leads SET ${sets} WHERE id=@id`)
  stmt.run({ ...req.body, id })
  const row = db.prepare('SELECT * FROM leads WHERE id=?').get(id)
  res.json(row)
})

app.post('/api/leads', (req, res) => {
  const insert = db.prepare(`
INSERT INTO leads (company_name, contact_name, email, phone, country, stage, source, owner,
annual_revenue, next_action_date, notes, tags)
VALUES (@company_name, @contact_name, @email, @phone, @country, @stage, @source, @owner,
@annual_revenue, @next_action_date, @notes, @tags)
`)
  const info = insert.run(req.body)
  const row = db.prepare('SELECT * FROM leads WHERE id=?').get(info.lastInsertRowid)
  res.status(201).json(row)
})

app.post('/api/leads/bulk-delete', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : []
  if (ids.length === 0) return res.status(400).json({ error: 'ids required' })
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(ids)
  res.json({ deleted: ids.length })
})

app.post('/api/leads/bulk-edit', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : []
  const column = req.body?.column

  if (ids.length === 0) return res.status(400).json({ error: 'ids required' })
  if (!column || !EDITABLE_COLUMNS.has(column)) {
    return res.status(400).json({ error: 'Unsupported column for bulk edit.' })
  }

  const result = coerceBulkEditValue(column, req.body?.value)
  if (!result.ok) {
    return res.status(400).json({ error: result.error })
  }

  const placeholders = ids.map(() => '?').join(',')
  try {
    const stmt = db.prepare(`UPDATE leads SET ${column} = ? WHERE id IN (${placeholders})`)
    const info = stmt.run(result.value, ...ids)
    res.json({ updated: info.changes })
  } catch (error) {
    console.error('Bulk edit failed', error)
    res.status(500).json({ error: 'Bulk edit failed' })
  }
})

app.post('/api/leads/bulk-duplicate', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : []
  if (ids.length === 0) return res.status(400).json({ error: 'ids required' })

  let copies = Number(req.body?.copies ?? 1)
  if (!Number.isInteger(copies) || copies < 1) {
    return res.status(400).json({ error: 'Copies must be a positive integer.' })
  }
  copies = Math.min(copies, 25)

  const prefix = typeof req.body?.prefix === 'string' ? req.body.prefix : ''
  const suffix = typeof req.body?.suffix === 'string' ? req.body.suffix : ''

  const placeholders = ids.map(() => '?').join(',')
  const records = db.prepare(`SELECT * FROM leads WHERE id IN (${placeholders})`).all(ids)
  if (records.length === 0) {
    return res.status(404).json({ error: 'No leads found for the provided ids.' })
  }

  const insertStmt = db.prepare(`
    INSERT INTO leads (
      company_name, contact_name, email, phone, country, stage, source, owner, annual_revenue, next_action_date, created_at, notes, tags
    ) VALUES (
      @company_name, @contact_name, @email, @phone, @country, @stage, @source, @owner, @annual_revenue, @next_action_date, @created_at, @notes, @tags
    )
  `)

  const duplicateTransaction = db.transaction(() => {
    const createdIds = []
    records.forEach(record => {
      for (let index = 0; index < copies; index += 1) {
        const payload = {
          company_name: formatDuplicateName(record.company_name, { prefix, suffix, index, copies }),
          contact_name: record.contact_name,
          email: record.email,
          phone: record.phone,
          country: record.country,
          stage: record.stage,
          source: record.source,
          owner: record.owner,
          annual_revenue: record.annual_revenue,
          next_action_date: record.next_action_date,
          created_at: new Date().toISOString(),
          notes: record.notes,
          tags: record.tags,
        }
        const info = insertStmt.run(payload)
        createdIds.push(info.lastInsertRowid)
      }
    })
    return createdIds
  })

  try {
    const idsCreated = duplicateTransaction()
    res.json({ duplicated: idsCreated.length, ids: idsCreated })
  } catch (error) {
    console.error('Bulk duplicate failed', error)
    res.status(500).json({ error: 'Bulk duplicate failed' })
  }
})

const CURRENT_USER_ID = 1
app.get('/api/views', (req, res) => {
  const resource = req.query.resource
  if (!resource) return res.status(400).json({ error: 'resource required' })

  const rows = db.prepare(`
      SELECT id, name, resource, state, visibility, created_at, updated_at
      FROM views
      WHERE user_id=@uid AND resource=@resource
      ORDER BY name ASC
    `).all({ uid: CURRENT_USER_ID, resource })

  res.json(rows.map(r => ({ ...r, state: JSON.parse(r.state) })))
})

app.post('/api/views', (req, res) => {
  const { name, resource, state, visibility = 'private', is_default = 0 } = req.body || {}
  if (!name || !resource || !state) return res.status(400).json({ error: 'name, resource, state required' })

  const stmt = db.prepare(`
      INSERT INTO views (user_id, resource, name, state, visibility)
      VALUES (@uid, @resource, @name, @state, @visibility)
    `)

  try {
    const info = stmt.run({
      uid: CURRENT_USER_ID,
      resource,
      name,
      state: JSON.stringify(state),
      visibility,
      is_default: is_default ? 1 : 0
    })

    const view = db.prepare('SELECT * FROM views WHERE id=?').get(info.lastInsertRowid)
    res.status(201).json({ ...view, state: JSON.parse(view.state) })
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'view name already exists' })
    }
    throw e
  }
})

app.patch('/api/views/:id', (req, res) => {
  const id = +req.params.id
  const updates = []
  const params = { id, uid: CURRENT_USER_ID }

  if ('name' in req.body) { updates.push('name=@name'); params.name = req.body.name }
  if ('state' in req.body) { updates.push('state=@state'); params.state = JSON.stringify(req.body.state) }
  if ('visibility' in req.body) { updates.push('visibility=@visibility'); params.visibility = req.body.visibility }

  if (!updates.length) return res.status(400).json({ error: 'no fields to update' })

  db.prepare(`UPDATE views SET ${updates.join(', ')}, updated_at=datetime('now') WHERE id=@id AND user_id=@uid`).run(params)
  const view = db.prepare('SELECT * FROM views WHERE id=@id AND user_id=@uid').get(params)
  if (!view) return res.status(404).json({ error: 'not found' })
  res.json({ ...view, state: JSON.parse(view.state) })
})

app.delete('/api/views/:id', (req, res) => {
  const id = +req.params.id
  const info = db.prepare('DELETE FROM views WHERE id=@id AND user_id=@uid').run({ id, uid: CURRENT_USER_ID })
  res.json({ deleted: info.changes })
})

const PORT = globalThis.process?.env?.PORT || 5174
app.listen(PORT, () => console.log(`CRM API on http://localhost:${PORT}`))

