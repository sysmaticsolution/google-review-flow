// Storage keys
const SETTINGS_KEY = 'google_review_flow_settings_v2';
const FEEDBACK_KEY = 'google_review_flow_internal_feedbacks';

export const DEFAULT_BUSINESS_SETTINGS = {
  businessName: 'Loop',
  businessCategory: 'Café & Quick Bites',
  address: 'Feel it. Eat it. Repeat.',
  avatarUrl: '/images/loop-avatar.jpg',
  coverPhoto: '/images/loop-cover.jpg',
  currentGoogleRating: 4.9,
  totalGoogleReviews: 312,
  googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4', // Default Google Place ID write-review link
  managerEmail: 'info@veltron.in',
  managerPhone: '+91 98765 43210',
  redirectDelaySeconds: 2.5,
  autoRedirectPositive: true,
};

export function getStoredSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_BUSINESS_SETTINGS, ...JSON.parse(data) } : DEFAULT_BUSINESS_SETTINGS;
  } catch (err) {
    console.error('Error loading settings', err);
    return DEFAULT_BUSINESS_SETTINGS;
  }
}

export function saveStoredSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings', err);
  }
}

export function getStoredFeedbacks() {
  try {
    const data = localStorage.getItem(FEEDBACK_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error loading feedbacks', err);
    return [];
  }
}

export function saveInternalFeedback(feedback) {
  try {
    const existing = getStoredFeedbacks();
    const newEntry = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      ...feedback,
    };
    const updated = [newEntry, ...existing];
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (err) {
    console.error('Error saving internal feedback', err);
    return null;
  }
}

export function clearStoredFeedbacks() {
  try {
    localStorage.removeItem(FEEDBACK_KEY);
  } catch (err) {
    console.error('Error clearing feedbacks', err);
  }
}
