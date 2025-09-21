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
created_at TEXT DEFAULT (datetime('now')),
tags TEXT -- JSON array of strings
);
`);


// Seed when empty
const count = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
if (count === 0) {
const countries = ['Ghana','Kenya','Nigeria','Rwanda','Morocco','South Africa','Egypt'];
const stages = ['Prospect','Qualified','Proposal','Won','Lost'];
const sources = ['Referral','Ads','Events','Outbound','Organic'];
const owners = ['Teammate A','Teammate B', 'Teammate C'];
const rand = (min,max) => Math.round((Math.random()*(max-min)+min)*100)/100;


const insert = db.prepare(`
INSERT INTO leads (
company_name, contact_name, email, phone, country, stage, source, owner,
annual_revenue, next_action_date, tags
) VALUES (@company_name, @contact_name, @email, @phone, @country, @stage, @source, @owner,
@annual_revenue, @next_action_date, @tags)
`);


const tx = db.transaction(() => {
for (let i = 1; i <= 10000; i++) {
const ctry = countries[i % countries.length];
const stg = stages[i % stages.length];
const src = sources[i % sources.length];
const own = owners[i % owners.length];
const rev = rand(1_000, 250_000);
const next = new Date(Date.now() + (i % 60) * 86400000).toISOString().slice(0,10);
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
tags: tagz,
});
}
});
tx();
}


export default db;