import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper to determine the best LAN IP for mobile phone testing
function getLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const isVirtual = name.toLowerCase().includes('vmware') || 
                          name.toLowerCase().includes('virtual') || 
                          iface.address.startsWith('192.168.56.') ||
                          iface.address.startsWith('172.');
        if (!isVirtual) {
          return iface.address;
        }
        candidates.push(iface.address);
      }
    }
  }
  return candidates[0] || 'localhost';
}

app.get('/api/network-info', (req, res) => {
  const lanIp = getLanIp();
  res.json({
    lanIp,
    port: 5173,
    mobileUrl: `http://${lanIp}:5173`,
  });
});

// ----------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ----------------------------------------------------
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Missing authentication token.' });
  }

  const token = authHeader.split(' ')[1];
  const findSession = db.prepare(`
    SELECT s.token, s.email, a.role, a.name, a.tenant_id
    FROM auth_sessions s
    JOIN admins a ON s.email = a.email
    WHERE s.token = ?
  `);
  
  const session = findSession.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized or expired session. Please log in.' });
  }

  req.user = session;
  next();
}

function requireProductOwner(req, res, next) {
  if (req.user.role !== 'product_owner') {
    return res.status(403).json({ error: 'Forbidden. Product Owner privileges required.' });
  }
  next();
}

// ----------------------------------------------------
// 1. PUBLIC TENANT / BUSINESS PROFILE API (Customer View)
// ----------------------------------------------------
// Get business details by tenant id (e.g. /api/tenants/loop)
app.get('/api/tenants/:id', (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
    if (!row) {
      // Fallback to default tenant
      const fallback = db.prepare('SELECT * FROM tenants WHERE is_default = 1 LIMIT 1').get();
      if (!fallback) return res.status(404).json({ error: 'Tenant not found' });
      return res.json(formatTenant(fallback));
    }
    return res.json(formatTenant(row));
  } catch (err) {
    console.error('Error fetching tenant:', err);
    return res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// Get default tenant
app.get('/api/default-tenant', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM tenants WHERE is_default = 1 LIMIT 1').get() ||
                db.prepare('SELECT * FROM tenants LIMIT 1').get();
    if (!row) return res.status(404).json({ error: 'No tenant available' });
    return res.json(formatTenant(row));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch default tenant' });
  }
});

// Settings endpoint (maps to tenant profile)
app.get('/api/settings', (req, res) => {
  try {
    const tenantId = req.query.tenant || req.query.tenantId;
    let row;
    if (tenantId) {
      row = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    }
    if (!row) {
      row = db.prepare('SELECT * FROM tenants WHERE is_default = 1 LIMIT 1').get() ||
            db.prepare('SELECT * FROM tenants LIMIT 1').get();
    }
    if (!row) return res.status(404).json({ error: 'Tenant settings not found' });
    return res.json(formatTenant(row));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', authenticateUser, (req, res) => {
  try {
    const tenantId = req.user.tenant_id || 'loop';
    const s = req.body;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE tenants SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        address = COALESCE(?, address),
        google_review_url = COALESCE(?, google_review_url),
        avatar_url = COALESCE(?, avatar_url),
        cover_photo = COALESCE(?, cover_photo),
        manager_email = COALESCE(?, manager_email),
        manager_phone = COALESCE(?, manager_phone),
        updated_at = ?
      WHERE id = ?
    `).run(
      s.businessName,
      s.businessCategory,
      s.address,
      s.googleReviewUrl,
      s.avatarUrl,
      s.coverPhoto,
      s.managerEmail,
      s.managerPhone,
      now,
      tenantId
    );
    const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    return res.json({ success: true, settings: formatTenant(updated) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

function formatTenant(r) {
  return {
    id: r.id,
    businessName: r.name,
    businessCategory: r.category,
    address: r.address,
    avatarUrl: r.avatar_url,
    coverPhoto: r.cover_photo,
    currentGoogleRating: r.current_rating,
    totalGoogleReviews: r.total_reviews,
    googleReviewUrl: r.google_review_url,
    managerEmail: r.manager_email,
    managerPhone: r.manager_phone,
    isDefault: Boolean(r.is_default),
  };
}

// ----------------------------------------------------
// 2. PUBLIC FEEDBACK SUBMISSION
// ----------------------------------------------------
app.post('/api/feedbacks', (req, res) => {
  try {
    const {
      tenantId = 'loop',
      rating,
      businessName,
      issues = [],
      feedbackText,
      customerName = 'Anonymous Customer',
      customerContact = 'Not provided',
      wantFollowUp = true,
      ticketId,
    } = req.body;

    const id = 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const finalTicket = ticketId || 'REF-' + Math.floor(100000 + Math.random() * 900000);
    const createdAt = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO feedbacks (
        id, tenant_id, ticket_id, rating, business_name, issues, feedback_text,
        customer_name, customer_contact, want_follow_up, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
      tenantId,
      finalTicket,
      Number(rating),
      businessName || 'Loop',
      JSON.stringify(issues),
      feedbackText || '',
      customerName,
      customerContact,
      wantFollowUp ? 1 : 0,
      'Pending Review',
      createdAt
    );

    const feedbackRecord = {
      id,
      tenantId,
      ticketId: finalTicket,
      rating: Number(rating),
      businessName,
      issues,
      feedbackText,
      customerName,
      customerContact,
      wantFollowUp,
      status: 'Pending Review',
      createdAt,
    };

    return res.status(201).json({ success: true, feedback: feedbackRecord });
  } catch (err) {
    console.error('Error saving feedback:', err);
    return res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Authenticated feedback endpoints
app.get('/api/feedbacks', authenticateUser, (req, res) => {
  try {
    let rows;
    if (req.user.role === 'product_owner') {
      const tenantFilter = req.query.tenantId || req.query.tenant;
      if (tenantFilter) {
        rows = db.prepare('SELECT * FROM feedbacks WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantFilter);
      } else {
        rows = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC').all();
      }
    } else {
      const tenantId = req.user.tenant_id || 'loop';
      rows = db.prepare('SELECT * FROM feedbacks WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId);
    }

    const formatted = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      ticketId: r.ticket_id,
      rating: r.rating,
      businessName: r.business_name,
      issues: r.issues ? JSON.parse(r.issues) : [],
      feedbackText: r.feedback_text,
      customerName: r.customer_name,
      customerContact: r.customer_contact,
      wantFollowUp: Boolean(r.want_follow_up),
      status: r.status,
      createdAt: r.created_at,
    }));

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});

app.delete('/api/feedbacks', authenticateUser, (req, res) => {
  try {
    if (req.user.role === 'product_owner') {
      const tenantFilter = req.query.tenantId || req.query.tenant;
      if (tenantFilter) {
        db.prepare('DELETE FROM feedbacks WHERE tenant_id = ?').run(tenantFilter);
      } else {
        db.prepare('DELETE FROM feedbacks').run();
      }
    } else {
      const tenantId = req.user.tenant_id || 'loop';
      db.prepare('DELETE FROM feedbacks WHERE tenant_id = ?').run(tenantId);
    }
    return res.json({ success: true, message: 'Feedback records deleted from database' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear feedbacks' });
  }
});

// ----------------------------------------------------
// 3. TENANT ADMIN PORTAL API (For /login - Store Manager)
// Displays ONLY: QR Code & Stand + Private Feedback Inbox
// ----------------------------------------------------
// Get logged-in tenant's own profile
app.get('/api/tenant/my-data', authenticateUser, (req, res) => {
  try {
    const tenantId = req.user.tenant_id || 'loop';
    const row = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    if (!row) {
      return res.status(404).json({ error: 'Tenant profile not found' });
    }
    return res.json(formatTenant(row));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tenant profile' });
  }
});

// Get logged-in tenant's private feedback inbox
app.get('/api/tenant/my-feedbacks', authenticateUser, (req, res) => {
  try {
    const tenantId = req.user.tenant_id || 'loop';
    const rows = db.prepare(`
      SELECT * FROM feedbacks 
      WHERE tenant_id = ? 
      ORDER BY created_at DESC
    `).all(tenantId);

    const formatted = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      ticketId: r.ticket_id,
      rating: r.rating,
      businessName: r.business_name,
      issues: r.issues ? JSON.parse(r.issues) : [],
      feedbackText: r.feedback_text,
      customerName: r.customer_name,
      customerContact: r.customer_contact,
      wantFollowUp: Boolean(r.want_follow_up),
      status: r.status,
      createdAt: r.created_at,
    }));

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tenant feedbacks' });
  }
});

// Clear logged-in tenant's private feedbacks
app.delete('/api/tenant/my-feedbacks', authenticateUser, (req, res) => {
  try {
    const tenantId = req.user.tenant_id || 'loop';
    db.prepare('DELETE FROM feedbacks WHERE tenant_id = ?').run(tenantId);
    return res.json({ success: true, message: 'All feedback records deleted from database' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear tenant feedbacks' });
  }
});

// ----------------------------------------------------
// 4. PRODUCT OWNER MULTI-TENANT MASTER API (For /owner)
// Manages: All Tenants, Google Review Links, Config, and Credentials
// ----------------------------------------------------
// List all tenants on the platform
app.get('/api/owner/tenants', authenticateUser, requireProductOwner, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all();
    const formatted = rows.map((r) => {
      // Find admin email for this tenant
      const admin = db.prepare('SELECT email FROM admins WHERE tenant_id = ? LIMIT 1').get(r.id);
      return {
        ...formatTenant(r),
        adminEmail: admin ? admin.email : r.manager_email,
      };
    });
    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tenants list' });
  }
});

// Create a new tenant (Multi-tenant feature)
app.post('/api/owner/tenants', authenticateUser, requireProductOwner, (req, res) => {
  try {
    const {
      name,
      slug,
      category = 'Café & Restaurant',
      address = '',
      googleReviewUrl,
      avatarUrl = '/images/loop-avatar.jpg',
      coverPhoto = '/images/loop-cover.jpg',
      managerEmail,
      managerPassword = 'password123',
      managerPhone = '',
    } = req.body;

    if (!name || !googleReviewUrl) {
      return res.status(400).json({ error: 'Tenant Name and Google Review URL are required' });
    }

    const tenantId = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') : name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const existing = db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
    if (existing) {
      return res.status(400).json({ error: `Tenant slug '${tenantId}' already exists. Choose a unique slug.` });
    }

    const now = new Date().toISOString();
    const insertTenant = db.prepare(`
      INSERT INTO tenants (
        id, name, category, address, avatar_url, cover_photo,
        current_rating, total_reviews, google_review_url,
        manager_email, manager_phone, is_default, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTenant.run(
      tenantId,
      name.trim(),
      category.trim(),
      address.trim(),
      avatarUrl.trim(),
      coverPhoto.trim(),
      5.0,
      0,
      googleReviewUrl.trim(),
      managerEmail ? managerEmail.trim().toLowerCase() : `${tenantId}@veltron.in`,
      managerPhone.trim(),
      0,
      now,
      now
    );

    // Create Tenant Admin credentials if email provided
    const adminEmail = managerEmail ? managerEmail.trim().toLowerCase() : `${tenantId}@veltron.in`;
    const findAdmin = db.prepare('SELECT email FROM admins WHERE email = ?').get(adminEmail);
    if (!findAdmin) {
      db.prepare(`
        INSERT INTO admins (email, password, role, name, tenant_id, created_at)
        VALUES (?, ?, 'tenant_admin', ?, ?, ?)
      `).run(adminEmail, managerPassword, `${name} Manager`, tenantId, now);
    }

    return res.status(201).json({ success: true, tenantId });
  } catch (err) {
    console.error('Error creating tenant:', err);
    return res.status(500).json({ error: 'Failed to create new tenant' });
  }
});

// Update an existing tenant configuration (Google Review URL, branding, etc.)
app.put('/api/owner/tenants/:id', authenticateUser, requireProductOwner, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      address,
      googleReviewUrl,
      avatarUrl,
      coverPhoto,
      managerEmail,
      managerPhone,
      managerPassword,
    } = req.body;

    const existing = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE tenants SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        address = COALESCE(?, address),
        google_review_url = COALESCE(?, google_review_url),
        avatar_url = COALESCE(?, avatar_url),
        cover_photo = COALESCE(?, cover_photo),
        manager_email = COALESCE(?, manager_email),
        manager_phone = COALESCE(?, manager_phone),
        updated_at = ?
      WHERE id = ?
    `).run(
      name,
      category,
      address,
      googleReviewUrl,
      avatarUrl,
      coverPhoto,
      managerEmail ? managerEmail.toLowerCase() : null,
      managerPhone,
      now,
      id
    );

    // If manager password or email updated, update in admins table
    if (managerPassword && managerPassword.trim()) {
      db.prepare(`UPDATE admins SET password = ? WHERE tenant_id = ?`).run(managerPassword.trim(), id);
    }
    if (managerEmail && managerEmail.trim()) {
      db.prepare(`UPDATE admins SET email = ? WHERE tenant_id = ?`).run(managerEmail.trim().toLowerCase(), id);
    }

    const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
    return res.json({ success: true, tenant: formatTenant(updated) });
  } catch (err) {
    console.error('Error updating tenant:', err);
    return res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// Delete a tenant
app.delete('/api/owner/tenants/:id', authenticateUser, requireProductOwner, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM feedbacks WHERE tenant_id = ?').run(id);
    db.prepare('DELETE FROM admins WHERE tenant_id = ?').run(id);
    db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
    return res.json({ success: true, message: `Tenant '${id}' deleted.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// ----------------------------------------------------
// 5. AUTHENTICATION & LOGIN API
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const findAdmin = db.prepare('SELECT * FROM admins WHERE LOWER(email) = ?');
    const admin = findAdmin.get(cleanEmail);

    if (!admin || admin.password !== password.trim()) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate session token
    const token = 'sat_' + crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const insertSession = db.prepare(`
      INSERT INTO auth_sessions (token, email, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    insertSession.run(token, admin.email, now.toISOString(), expiresAt);

    const user = {
      email: admin.email,
      role: admin.role,
      name: admin.name,
      tenantId: admin.tenant_id,
      token,
    };

    return res.json({ success: true, user, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false });
  }

  const token = authHeader.split(' ')[1];
  const session = db.prepare(`
    SELECT s.token, s.email, a.role, a.name, a.tenant_id
    FROM auth_sessions s
    JOIN admins a ON s.email = a.email
    WHERE s.token = ?
  `).get(token);

  if (!session) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: {
      email: session.email,
      role: session.role,
      name: session.name,
      tenantId: session.tenant_id,
      token: session.token,
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
  }
  return res.json({ success: true });
});

// Update Product Owner Credentials
app.put('/api/owner/credentials', authenticateUser, requireProductOwner, (req, res) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;
    const currentAdminEmail = req.user.email;

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(currentAdminEmail);
    if (!admin || admin.password !== currentPassword.trim()) {
      return res.status(401).json({ error: 'Incorrect current password.' });
    }

    const targetEmail = newEmail ? newEmail.trim().toLowerCase() : currentAdminEmail;
    const targetPassword = newPassword && newPassword.trim() ? newPassword.trim() : admin.password;

    if (newPassword && newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    if (targetEmail !== currentAdminEmail) {
      const existing = db.prepare('SELECT email FROM admins WHERE email = ?').get(targetEmail);
      if (existing) {
        return res.status(400).json({ error: 'Email already registered.' });
      }
      db.prepare('UPDATE auth_sessions SET email = ? WHERE email = ?').run(targetEmail, currentAdminEmail);
      db.prepare('UPDATE admins SET email = ?, password = ? WHERE email = ?').run(targetEmail, targetPassword, currentAdminEmail);
    } else {
      db.prepare('UPDATE admins SET password = ? WHERE email = ?').run(targetPassword, currentAdminEmail);
    }

    return res.json({
      success: true,
      message: 'Product Owner credentials updated.',
      user: {
        email: targetEmail,
        role: admin.role,
        name: admin.name,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update credentials' });
  }
});

// Serve frontend static assets in production & handle SPA fallback (e.g. /login or /owner)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });
}

// Start Express SQLite Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Backend] SQLite Multi-Tenant API Server running at http://127.0.0.1:${PORT}`);
});
