import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const ALLOWED_SORT = new Set([
'id','company_name','contact_name','email','country','stage','source','owner','annual_revenue','next_action_date','created_at'
]);


app.get('/api/leads', (req, res) => {
const page = Math.max(parseInt(req.query.page || '1', 10), 1);
const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '25', 10), 1), 200);
const sort = ALLOWED_SORT.has(req.query.sort) ? req.query.sort : 'id';
const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC';

const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
const where = [];
const params = {};

// Text contains (LIKE)
if (filters.company) { where.push('company_name LIKE @company'); params.company = `%${filters.company}%`; }
if (filters.contact) { where.push('contact_name LIKE @contact'); params.contact = `%${filters.contact}%`; }
if (filters.email) { where.push('email LIKE @email'); params.email = `%${filters.email}%`; }
if (filters.country) { where.push('country LIKE @country'); params.country = `%${filters.country}%`; }

// Exact (selects)
if (filters.stage) { where.push('stage = @stage'); params.stage = filters.stage; }
if (filters.source) { where.push('source = @source'); params.source = filters.source; }
if (filters.owner) { where.push('owner = @owner'); params.owner = filters.owner; }


// Ranges
if (filters.minRevenue) { where.push('annual_revenue >= @minRevenue'); params.minRevenue = +filters.minRevenue; }
if (filters.maxRevenue) { where.push('annual_revenue <= @maxRevenue'); params.maxRevenue = +filters.maxRevenue; }


// Dates (YYYY-MM-DD string compare ok for ISO)
if (filters.createdFrom) { where.push('date(created_at) >= date(@createdFrom)'); params.createdFrom = filters.createdFrom; }
if (filters.createdTo) { where.push('date(created_at) <= date(@createdTo)'); params.createdTo = filters.createdTo; }
if (filters.nextBefore) { where.push('date(next_action_date) <= date(@nextBefore)'); params.nextBefore = filters.nextBefore; }
if (filters.nextAfter) { where.push('date(next_action_date) >= date(@nextAfter)'); params.nextAfter = filters.nextAfter; }


const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
const total = db.prepare(`SELECT COUNT(*) AS t FROM leads ${whereSql}`).get(params).t;


const sql = `
SELECT id, company_name, contact_name, email, phone, country, stage, source, owner,
annual_revenue, next_action_date, created_at, tags
FROM leads
${whereSql}
ORDER BY ${sort} ${dir}
LIMIT @limit OFFSET @offset
`;
const rows = db.prepare(sql).all({ ...params, limit: pageSize, offset: (page-1)*pageSize });


res.json({ rows, total });
});


app.patch('/api/leads/:id', (req, res) => {
const id = +req.params.id;
const allowed = ['company_name','contact_name','email','phone','country','stage','source','owner','annual_revenue','next_action_date','tags'];
const fields = Object.keys(req.body).filter(k => allowed.includes(k));
if (fields.length === 0) return res.status(400).json({ error: 'No updatable fields' });


const sets = fields.map(f => `${f}=@${f}`).join(', ');
const stmt = db.prepare(`UPDATE leads SET ${sets} WHERE id=@id`);
stmt.run({ ...req.body, id });
const row = db.prepare(`SELECT * FROM leads WHERE id=?`).get(id);
res.json(row);
});


app.post('/api/leads', (req, res) => {
const insert = db.prepare(`
INSERT INTO leads (company_name, contact_name, email, phone, country, stage, source, owner,
annual_revenue, next_action_date, tags)
VALUES (@company_name, @contact_name, @email, @phone, @country, @stage, @source, @owner,
@annual_revenue, @next_action_date, @tags)
`);
const info = insert.run(req.body);
const row = db.prepare('SELECT * FROM leads WHERE id=?').get(info.lastInsertRowid);
res.status(201).json(row);
});


app.post('/api/leads/bulk-delete', (req, res) => {
const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
if (ids.length === 0) return res.status(400).json({ error: 'ids required' });
const placeholders = ids.map(() => '?').join(',');
db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(ids);
res.json({ deleted: ids.length });
});


// Views API
const CURRENT_USER_ID = 1;
app.get('/api/views', (req, res) => {
    const resource = req.query.resource;
    if (!resource) return res.status(400).json({ error: 'resource required' });
  
    const rows = db.prepare(`
      SELECT id, name, resource, state, visibility, created_at, updated_at
      FROM views
      WHERE user_id=@uid AND resource=@resource
      ORDER BY name ASC
    `).all({ uid: CURRENT_USER_ID, resource });
  
    res.json(rows.map(r => ({ ...r, state: JSON.parse(r.state) })));
  });

// Create view
app.post('/api/views', (req, res) => {
    const { name, resource, state, visibility = 'private', is_default = 0 } = req.body || {};
    if (!name || !resource || !state) return res.status(400).json({ error: 'name, resource, state required' });
  
    const stmt = db.prepare(`
      INSERT INTO views (user_id, resource, name, state, visibility)
      VALUES (@uid, @resource, @name, @state, @visibility)
    `);
  
    try {
      const info = stmt.run({
        uid: CURRENT_USER_ID,
        resource,
        name,
        state: JSON.stringify(state),
        visibility,
        is_default: is_default ? 1 : 0
      });
  
      const view = db.prepare(`SELECT * FROM views WHERE id=?`).get(info.lastInsertRowid);
      res.status(201).json({ ...view, state: JSON.parse(view.state) });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'view name already exists' });
      }
      throw e;
    }
  });


  // Update view (rename or change state)
app.patch('/api/views/:id', (req, res) => {
    const id = +req.params.id;
    const updates = [];
    const params = { id, uid: CURRENT_USER_ID };
  
    if ('name' in req.body) { updates.push('name=@name'); params.name = req.body.name; }
    if ('state' in req.body) { updates.push('state=@state'); params.state = JSON.stringify(req.body.state); }
    if ('visibility' in req.body) { updates.push('visibility=@visibility'); params.visibility = req.body.visibility; }
    
    if (!updates.length) return res.status(400).json({ error: 'no fields to update' });
  
    db.prepare(`UPDATE views SET ${updates.join(', ')}, updated_at=datetime('now') WHERE id=@id AND user_id=@uid`).run(params);
    const view = db.prepare(`SELECT * FROM views WHERE id=@id AND user_id=@uid`).get(params);
    if (!view) return res.status(404).json({ error: 'not found' });
    res.json({ ...view, state: JSON.parse(view.state) });
  });
  
  app.delete('/api/views/:id', (req, res) => {
    const id = +req.params.id;
    const info = db.prepare(`DELETE FROM views WHERE id=@id AND user_id=@uid`).run({ id, uid: CURRENT_USER_ID });
    res.json({ deleted: info.changes });
  });

const PORT = process.env.PORT || 5174;
app.listen(PORT, () => console.log(`CRM API on http://localhost:${PORT}`));