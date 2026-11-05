import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'reviews.sqlite');
console.log(`[SQLite] Connecting to SQLite database at: ${dbPath}`);

export const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  PRAGMA journal_mode = WAL;
  
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    business_name TEXT,
    issues TEXT,
    feedback_text TEXT,
    customer_name TEXT,
    customer_contact TEXT,
    want_follow_up INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Pending Review',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admins (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

// Seed default Super Admin if not exists
const findAdmin = db.prepare('SELECT email FROM admins WHERE email = ?');
const defaultAdmin = findAdmin.get('info@veltron.in');

if (!defaultAdmin) {
  const insertAdmin = db.prepare(`
    INSERT INTO admins (email, password, role, name, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertAdmin.run(
    'info@veltron.in',
    'password123',
    'Super Admin',
    'Veltron Admin',
    new Date().toISOString()
  );
  console.log('[SQLite] Seeded default Super Admin (info@veltron.in)');
}

// Seed default Loop Cafe settings if not exists
const findSetting = db.prepare('SELECT key FROM settings WHERE key = ?');
const hasSettings = findSetting.get('business_profile');

if (!hasSettings) {
  const defaultSettings = {
    businessName: 'Loop',
    businessCategory: 'Café & Quick Bites',
    address: 'Feel it. Eat it. Repeat.',
    avatarUrl: '/images/loop-avatar.jpg',
    coverPhoto: '/images/loop-cover.jpg',
    currentGoogleRating: 4.9,
    totalGoogleReviews: 312,
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    managerEmail: 'info@veltron.in',
    managerPhone: '+91 98765 43210',
    redirectDelaySeconds: 2.5,
    autoRedirectPositive: true,
  };

  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);
  insertSetting.run(
    'business_profile',
    JSON.stringify(defaultSettings),
    new Date().toISOString()
  );
  console.log('[SQLite] Seeded initial business profile settings for Loop Cafe');
}

