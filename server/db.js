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

  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    address TEXT,
    avatar_url TEXT,
    cover_photo TEXT,
    current_rating REAL DEFAULT 4.9,
    total_reviews INTEGER DEFAULT 312,
    google_review_url TEXT NOT NULL,
    manager_email TEXT,
    manager_phone TEXT,
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT DEFAULT 'loop',
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
    tenant_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

// Migration safety: Add tenant_id column if upgrading existing DB tables
try {
  db.exec(`ALTER TABLE feedbacks ADD COLUMN tenant_id TEXT DEFAULT 'loop';`);
} catch (e) {
  // column already exists
}

try {
  db.exec(`ALTER TABLE admins ADD COLUMN tenant_id TEXT;`);
} catch (e) {
  // column already exists
}

// ----------------------------------------------------
// SEED DEFAULT TENANTS (Multi-Tenant concept)
// ----------------------------------------------------
const findLoop = db.prepare('SELECT id FROM tenants WHERE id = ?').get('loop');
if (!findLoop) {
  const insertTenant = db.prepare(`
    INSERT INTO tenants (
      id, name, category, address, avatar_url, cover_photo,
      current_rating, total_reviews, google_review_url,
      manager_email, manager_phone, is_default, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTenant.run(
    'loop',
    'Loop',
    'Café & Quick Bites',
    'Feel it. Eat it. Repeat.',
    '/images/loop-avatar.jpg',
    '/images/loop-cover.jpg',
    4.9,
    312,
    'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    'info@veltron.in',
    '+91 98765 43210',
    1,
    new Date().toISOString(),
    new Date().toISOString()
  );
  console.log('[SQLite] Seeded default tenant: Loop');
}

// Optional second demo tenant to show multi-tenancy in action
const findArtisan = db.prepare('SELECT id FROM tenants WHERE id = ?').get('artisan-table');
if (!findArtisan) {
  const insertTenant = db.prepare(`
    INSERT INTO tenants (
      id, name, category, address, avatar_url, cover_photo,
      current_rating, total_reviews, google_review_url,
      manager_email, manager_phone, is_default, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTenant.run(
    'artisan-table',
    'The Artisan Table & Roastery',
    'Artisan Bistro & Specialty Coffee',
    '104 Market Street, Financial District',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=200&h=200&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    4.8,
    186,
    'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    'manager@artisantable.com',
    '+1 (555) 019-2834',
    0,
    new Date().toISOString(),
    new Date().toISOString()
  );
  console.log('[SQLite] Seeded second demo tenant: The Artisan Table');
}

// ----------------------------------------------------
// SEED ADMIN CREDENTIALS (Separated Roles)
// ----------------------------------------------------

// 1. Product Owner (Master Platform Admin for /owner)
const findProductOwner = db.prepare('SELECT email FROM admins WHERE email = ?').get('owner@veltron.in');
if (!findProductOwner) {
  const insertOwner = db.prepare(`
    INSERT INTO admins (email, password, role, name, tenant_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertOwner.run(
    'owner@veltron.in',
    'ownerpassword123',
    'product_owner',
    'Veltron Product Owner',
    null,
    new Date().toISOString()
  );
  console.log('[SQLite] Seeded Product Owner: owner@veltron.in');
}

// 2. Tenant Admin (Cafe / Store Manager for /login)
const findTenantAdmin = db.prepare('SELECT email FROM admins WHERE email = ?').get('info@veltron.in');
if (!findTenantAdmin) {
  const insertAdmin = db.prepare(`
    INSERT INTO admins (email, password, role, name, tenant_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertAdmin.run(
    'info@veltron.in',
    'password123',
    'tenant_admin',
    'Loop Cafe Admin',
    'loop',
    new Date().toISOString()
  );
  console.log('[SQLite] Seeded Tenant Admin: info@veltron.in (Loop)');
} else {
  // Ensure tenant_id is set to 'loop'
  db.prepare(`UPDATE admins SET role = 'tenant_admin', tenant_id = 'loop' WHERE email = 'info@veltron.in'`).run();
}
