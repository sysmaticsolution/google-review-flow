import { DEFAULT_BUSINESS_SETTINGS } from './storage';

const TOKEN_KEY = 'google_review_auth_token';
const USER_KEY = 'google_review_auth_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveAuthSession(user, token, rememberMe = true) {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function getAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
export async function apiFetchSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load settings from server');
    return await res.json();
  } catch (err) {
    console.warn('[API] Could not fetch settings from SQLite backend, falling back to default:', err);
    return DEFAULT_BUSINESS_SETTINGS;
  }
}

export async function apiUpdateSettings(settings) {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update settings');
    }
    const data = await res.json();
    return data.settings;
  } catch (err) {
    console.error('[API] Error updating settings:', err);
    throw err;
  }
}

// ----------------------------------------------------
// FEEDBACKS
// ----------------------------------------------------
export async function apiSubmitFeedback(payload) {
  try {
    const res = await fetch('/api/feedbacks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit feedback');
    }
    const data = await res.json();
    return data.feedback;
  } catch (err) {
    console.error('[API] Error submitting feedback to backend:', err);
    throw err;
  }
}

export async function apiFetchFeedbacks() {
  try {
    const res = await fetch('/api/feedbacks', {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthSession();
        throw new Error('Unauthorized');
      }
      throw new Error('Failed to fetch feedbacks');
    }
    return await res.json();
  } catch (err) {
    console.error('[API] Error fetching feedbacks:', err);
    throw err;
  }
}

export async function apiClearFeedbacks() {
  try {
    const res = await fetch('/api/feedbacks', {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error('Failed to clear feedbacks');
    return await res.json();
  } catch (err) {
    console.error('[API] Error clearing feedbacks:', err);
    throw err;
  }
}

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
export async function apiLogin(email, password, rememberMe = true) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Login failed' };
    }

    saveAuthSession(data.user, data.token, rememberMe);
    return { success: true, user: data.user, token: data.token };
  } catch (err) {
    console.error('[API] Login request error:', err);
    return { success: false, error: 'Could not connect to backend server' };
  }
}

export async function apiLogout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
    });
  } catch (e) {
    // ignore
  } finally {
    clearAuthSession();
  }
}
