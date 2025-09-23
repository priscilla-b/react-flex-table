import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// Enable verbose mode for better debugging
sqlite3.verbose();

// Create database connection
const db = new sqlite3.Database('./flex-table.db');

// Promisify database methods for async/await usage
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbExec = promisify(db.exec.bind(db));

// Initialize database function
async function initializeDatabase() {
  try {
    // Set WAL mode for better performance
    await dbRun('PRAGMA journal_mode = WAL');

    // Create tables
    await dbExec(`
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
    created_at TEXT DEFAULT (datetime('now'))
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
    const userCount = await dbGet('SELECT COUNT(*) as c FROM users');
    if (userCount.c === 0) {
      await dbRun('INSERT INTO users (email) VALUES (?)', ['demo@example.com']);
    }

    const count = await dbGet('SELECT COUNT(*) as c FROM leads');
    if (count.c === 0) {
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

      // Begin transaction for bulk insert
      await dbRun('BEGIN TRANSACTION');
      
      try {
        for (let i = 1; i <= 10000; i++) {
          const ctry = countries[i % countries.length];
          const stg = stages[i % stages.length];
          const src = sources[i % sources.length];
          const own = owners[i % owners.length];
          const rev = rand(1_000, 250_000);
          const next = new Date(Date.now() + (i % 60) * 86400000).toISOString().slice(0,10);
          const notes = notesSamples[i % notesSamples.length];
          
          await dbRun(`
            INSERT INTO leads (
              company_name, contact_name, email, phone, country, stage, source, owner,
              annual_revenue, next_action_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            `Company ${i}`,
            `Founder ${i}`,
            `founder${i}@example.com`,
            `+233-55-${String(100000+i).slice(-6)}`,
            ctry,
            stg,
            src,
            own,
            rev,
            next,
            notes
          ]);
        }
        
        await dbRun('COMMIT');
        console.log('Database seeded with 10,000 leads');
      } catch (error) {
        await dbRun('ROLLBACK');
        throw error;
      }
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Export database instance and helper functions
export default {
  db,
  run: dbRun,
  get: dbGet,
  all: dbAll,
  exec: dbExec,
  initialize: initializeDatabase
};