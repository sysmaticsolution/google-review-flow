import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import os from 'node:os';
import { db } from './db.js';

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
        // Exclude virtual adapters if physical exists
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

// Auth middleware to verify Super Admin session token
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Missing authentication token.' });
  }

  const token = authHeader.split(' ')[1];
  const findSession = db.prepare(`
    SELECT s.token, s.email, a.role, a.name
    FROM auth_sessions s
    JOIN admins a ON s.email = a.email
    WHERE s.token = ?
  `);
  
  const session = findSession.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized or expired session. Please log in.' });
  }

  req.admin = session;
  next();
}

// ----------------------------------------------------
// 1. BUSINESS SETTINGS API
// ----------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('business_profile');
    if (!row) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    return res.json(JSON.parse(row.value));
  } catch (err) {
    console.error('Error fetching settings:', err);
    return res.status(500).json({ error: 'Failed to fetch settings from SQLite' });
  }
});

app.post('/api/settings', authenticateAdmin, (req, res) => {
  try {
    const settingsData = req.body;
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    upsert.run('business_profile', JSON.stringify(settingsData), new Date().toISOString());
    return res.json({ success: true, settings: settingsData });
  } catch (err) {
    console.error('Error updating settings:', err);
    return res.status(500).json({ error: 'Failed to update settings in SQLite' });
  }
});

// ----------------------------------------------------
// 2. FEEDBACKS API
// ----------------------------------------------------
// Public: Customer submits 1-3 star feedback
app.post('/api/feedbacks', (req, res) => {
  try {
    const {
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
        id, ticket_id, rating, business_name, issues, feedback_text,
        customer_name, customer_contact, want_follow_up, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
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
    return res.status(500).json({ error: 'Failed to save feedback to SQLite' });
  }
});

// Protected: Only authorized Super Admin can view backend feedbacks
app.get('/api/feedbacks', authenticateAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC').all();
    const formatted = rows.map((r) => ({
      id: r.id,
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
    console.error('Error retrieving feedbacks:', err);
    return res.status(500).json({ error: 'Failed to retrieve feedbacks from SQLite' });
  }
});

// Protected: Clear feedbacks
app.delete('/api/feedbacks', authenticateAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM feedbacks').run();
    return res.json({ success: true, message: 'All feedback records deleted from SQLite' });
  } catch (err) {
    console.error('Error clearing feedbacks:', err);
    return res.status(500).json({ error: 'Failed to clear feedbacks in SQLite' });
  }
});

// ----------------------------------------------------
// 3. SUPER ADMIN AUTH API
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
      return res.status(401).json({ error: 'Invalid email or password. Super Admin access only.' });
    }

    // Generate session token
    const token = 'sat_' + crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const insertSession = db.prepare(`
      INSERT INTO auth_sessions (token, email, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    insertSession.run(token, admin.email, now.toISOString(), expiresAt);

    const user = {
      email: admin.email,
      role: admin.role,
      name: admin.name,
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
    SELECT s.token, s.email, a.role, a.name
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

// Start Express SQLite Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Backend] SQLite API Server running at http://127.0.0.1:${PORT}`);
});

