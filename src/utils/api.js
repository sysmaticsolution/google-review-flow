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
// PUBLIC SETTINGS / BUSINESS PROFILE
// ----------------------------------------------------
export async function apiFetchSettings(tenantId) {
  try {
    const url = tenantId ? `/api/settings?tenant=${encodeURIComponent(tenantId)}` : '/api/settings';
    const res = await fetch(url);
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
// TENANT STORE MANAGER API (/api/tenant)
// ----------------------------------------------------
export async function apiFetchTenantMyData() {
  try {
    const res = await fetch('/api/tenant/my-data', {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error('Failed to fetch store manager profile');
    return await res.json();
  } catch (err) {
    console.error('[API] Error fetching store manager profile:', err);
    throw err;
  }
}

export async function apiFetchTenantFeedbacks() {
  try {
    const res = await fetch('/api/tenant/my-feedbacks', {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error('Failed to fetch store feedbacks');
    return await res.json();
  } catch (err) {
    console.error('[API] Error fetching store feedbacks:', err);
    throw err;
  }
}

export async function apiClearTenantFeedbacks() {
  try {
    const res = await fetch('/api/tenant/my-feedbacks', {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error('Failed to delete store feedbacks');
    return await res.json();
  } catch (err) {
    console.error('[API] Error deleting store feedbacks:', err);
    throw err;
  }
}

// ----------------------------------------------------
// PRODUCT OWNER MULTI-TENANT MASTER API (/api/owner)
// ----------------------------------------------------
export async function apiUploadImage(image, name = 'image') {
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload image');
    }
    return data.url;
  } catch (err) {
    console.error('[API] Error uploading image:', err);
    // If upload endpoint fails, fallback to using the base64 dataUrl directly
    return image;
  }
}

export async function apiFetchOwnerTenants() {
  try {
    const res = await fetch('/api/owner/tenants', {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error('Failed to fetch tenants list');
    return await res.json();
  } catch (err) {
    console.error('[API] Error fetching tenants list:', err);
    throw err;
  }
}

export async function apiCreateOwnerTenant(payload) {
  try {
    const res = await fetch('/api/owner/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create tenant');
    }
    return data;
  } catch (err) {
    console.error('[API] Error creating tenant:', err);
    throw err;
  }
}

export async function apiUpdateOwnerTenant(id, payload) {
  try {
    const res = await fetch(`/api/owner/tenants/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update tenant');
    }
    return data;
  } catch (err) {
    console.error('[API] Error updating tenant:', err);
    throw err;
  }
}

export async function apiDeleteOwnerTenant(id) {
  try {
    const res = await fetch(`/api/owner/tenants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete tenant');
    }
    return data;
  } catch (err) {
    console.error('[API] Error deleting tenant:', err);
    throw err;
  }
}

export async function apiUpdateOwnerCredentials({ currentPassword, newEmail, newPassword }) {
  try {
    const res = await fetch('/api/owner/credentials', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ currentPassword, newEmail, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update Product Owner credentials');
    }

    if (data.user) {
      const currentToken = getStoredToken();
      saveAuthSession(data.user, currentToken, true);
    }

    return data;
  } catch (err) {
    console.error('[API] Error updating owner credentials:', err);
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

export async function apiUpdateCredentials({ currentPassword, newEmail, newPassword }) {
  try {
    const res = await fetch('/api/auth/credentials', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ currentPassword, newEmail, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update credentials');
    }

    if (data.user) {
      const currentToken = getStoredToken();
      saveAuthSession(data.user, currentToken, true);
    }

    return data;
  } catch (err) {
    console.error('[API] Error updating admin credentials:', err);
    throw err;
  }
}
