const AUTH_STORAGE_KEY = 'google_review_auth_user';

export const SUPER_ADMIN_CREDENTIALS = {
  email: 'info@veltron.in',
  password: 'password123',
  role: 'Super Admin',
  name: 'Veltron Admin',
};

export function getAuthenticatedUser() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading auth', err);
    return null;
  }
}

export function loginSuperAdmin(email, password, rememberMe = true) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (
    cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase() &&
    cleanPassword === SUPER_ADMIN_CREDENTIALS.password
  ) {
    const userSession = {
      email: SUPER_ADMIN_CREDENTIALS.email,
      role: SUPER_ADMIN_CREDENTIALS.role,
      name: SUPER_ADMIN_CREDENTIALS.name,
      loggedInAt: new Date().toISOString(),
    };

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userSession));
    return { success: true, user: userSession };
  }

  return { success: false, error: 'Invalid email or password. Please verify Super Admin credentials.' };
}

export function logoutAdmin() {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error('Error logging out', err);
  }
}

