import Database from 'better-sqlite3';
const db = new Database('./flex-table.db');
db.pragma('journal_mode = WAL');


db.exec(`
CREATE TABLE IF NOT EXISTS leads (

id INTEGER PRIMARY KEY,
company_name TEXT NOT NULL,
contact_name TEXT NOT NULL,
email TEXT NOT NULL,
phone TEXT,
country TEXT,
stage TEXT NOT NULL CHECK(stage IN ('Prospect','Qualified','Proposal','Won','Lost')),
source TEXT NOT NULL CHECK(source IN ('Referral','Ads','Events','Outbound','Organic')),
owner TEXT NOT NULL,
annual_revenue REAL,
next_action_date TEXT, -- ISO string (YYYY-MM-DD)
notes TEXT,
created_at TEXT DEFAULT (datetime('now')),
tags TEXT -- JSON array of strings
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE
);


CREATE TABLE IF NOT EXISTS views (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  resource TEXT NOT NULL,             
  name TEXT NOT NULL,
  state TEXT NOT NULL,                
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','team','org')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Make name unique per user/resource for easy reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_views_user_resource_name
  ON views (user_id, resource, name);
`);



// Seed when empty
// Ensure a default user exists
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  db.prepare('INSERT INTO users (email) VALUES (?)').run('demo@example.com');
}

const count = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
if (count === 0) {
const countries = ['Ghana','Kenya','Nigeria','Rwanda','Morocco','South Africa','Egypt'];
const stages = ['Prospect','Qualified','Proposal','Won','Lost'];
const sources = ['Referral','Ads','Events','Outbound','Organic'];
const owners = ['Teammate A','Teammate B', 'Teammate C'];
const notesSamples = [
  'Follow up next week',
  'Interested in premium plan',
  'Check in with client about project status',
  'Prepare presentation for next meeting',
  'Send contract for review',
  'Discuss financing options',
  'Schedule demo session',
  'Client requested additional information',
  'Potential for upsell in Q3',
  'Needs approval from legal team'

];
const rand = (min,max) => Math.round((Math.random()*(max-min)+min)*100)/100;


const insert = db.prepare(`
INSERT INTO leads (
company_name, contact_name, email, phone, country, stage, source, owner,
annual_revenue, next_action_date, notes, tags
) VALUES (@company_name, @contact_name, @email, @phone, @country, @stage, @source, @owner,
@annual_revenue, @next_action_date, @notes, @tags)
`);


const tx = db.transaction(() => {
for (let i = 1; i <= 10000; i++) {
const ctry = countries[i % countries.length];
const stg = stages[i % stages.length];
const src = sources[i % sources.length];
const own = owners[i % owners.length];
const rev = rand(1_000, 250_000);
const next = new Date(Date.now() + (i % 60) * 86400000).toISOString().slice(0,10);
const notes = notesSamples[i % notesSamples.length];
const tagz = JSON.stringify([ctry, stg].filter(Boolean));
insert.run({
company_name: `Company ${i}`,
contact_name: `Founder ${i}`,
email: `founder${i}@example.com`,
phone: `+233-55-${String(100000+i).slice(-6)}`,
country: ctry,
stage: stg,
source: src,
owner: own,
annual_revenue: rev,
next_action_date: next,
notes: notes,
tags: tagz,
});
}
});
tx();
}


export default db;