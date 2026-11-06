import React, { useState, useEffect } from 'react';
import {
  apiFetchSettings,
  apiUpdateSettings,
  apiSubmitFeedback,
  apiFetchFeedbacks,
  apiClearFeedbacks,
  apiLogout,
  getStoredUser,
} from './utils/api';
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredFeedbacks,
  saveInternalFeedback,
  clearStoredFeedbacks,
} from './utils/storage';
import GoogleReviewForm from './components/GoogleReviewForm';
import LowRatingFeedback from './components/LowRatingFeedback';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [business, setBusiness] = useState(getStoredSettings);
  const [feedbacks, setFeedbacks] = useState(getStoredFeedbacks);
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  // Step state: 'form' | 'low_feedback'
  const [activeStep, setActiveStep] = useState('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Router: support dedicated /login and /admin routes
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.toLowerCase();
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname.toLowerCase());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path.toLowerCase());
  };

  const isLoginRoute = currentPath === '/login' || currentPath === '/admin' || currentPath.startsWith('/login');

  // Load settings from SQLite backend on initial mount
  useEffect(() => {
    let isMounted = true;
    apiFetchSettings()
      .then((serverSettings) => {
        if (isMounted && serverSettings) {
          setBusiness(serverSettings);
          saveStoredSettings(serverSettings);
        }
      })
      .catch((err) => console.warn('Using local settings cache:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch feedbacks from SQLite whenever authenticated
  useEffect(() => {
    if (currentUser) {
      apiFetchFeedbacks()
        .then((data) => {
          if (Array.isArray(data)) {
            setFeedbacks(data);
          }
        })
        .catch((err) => {
          if (err.message === 'Unauthorized') {
            setCurrentUser(null);
          }
        });
    }
  }, [currentUser]);

  // Check URL params for quick testing or table QR identification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const starParam = params.get('stars');
    if (starParam && !isNaN(starParam)) {
      const val = parseInt(starParam, 10);
      if (val >= 1 && val <= 5) {
        handleStarSelect(val);
      }
    }
  }, []);

  const redirectToGoogleReview = () => {
    const targetUrl = business.googleReviewUrl || 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4';
    window.location.href = targetUrl;
  };

  const handleStarSelect = (selectedRating) => {
    setRating(selectedRating);
    if (selectedRating <= 3) {
      // 1, 2, or 3 Stars -> Stay inside application for private feedback
      setActiveStep('low_feedback');
    } else {
      // > 3 rating (4 or 5 Stars) -> Directly open Google Review page immediately!
      redirectToGoogleReview();
    }
  };

  const handleReset = () => {
    setRating(0);
    setReviewText('');
    setActiveStep('form');
  };

  const handleSubmitLowFeedback = async (feedbackPayload) => {
    setIsSubmitting(true);
    try {
      // 1. Submit to SQLite backend
      const saved = await apiSubmitFeedback(feedbackPayload);
      if (saved) {
        setFeedbacks((prev) => [saved, ...prev]);
      }
    } catch (err) {
      // 2. Fallback to localStorage if offline
      console.warn('Backend unavailable, saving locally:', err);
      saveInternalFeedback(feedbackPayload);
      setFeedbacks(getStoredFeedbacks());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBusiness = async (updatedSettings) => {
    try {
      const saved = await apiUpdateSettings(updatedSettings);
      setBusiness(saved);
      saveStoredSettings(saved);
    } catch (err) {
      console.warn('Backend update failed, saving locally:', err);
      setBusiness(updatedSettings);
      saveStoredSettings(updatedSettings);
    }
  };

  const handleClearFeedbacks = async () => {
    try {
      await apiClearFeedbacks();
      setFeedbacks([]);
      clearStoredFeedbacks();
    } catch (err) {
      console.warn('Backend clear failed, clearing locally:', err);
      clearStoredFeedbacks();
      setFeedbacks([]);
    }
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    try {
      const liveFeedbacks = await apiFetchFeedbacks();
      if (Array.isArray(liveFeedbacks)) {
        setFeedbacks(liveFeedbacks);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
  };

  // -------------------------------------------------------------------------
  // ROUTE: /login or /admin (Dedicated Admin Portal)
  // -------------------------------------------------------------------------
  if (isLoginRoute) {
    if (!currentUser) {
      return (
        <AdminLogin
          isStandalonePage={true}
          onLoginSuccess={handleLoginSuccess}
          onGoHome={() => navigateTo('/')}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-3 sm:p-6 selection:bg-blue-500 selection:text-white">
        <AdminPanel
          business={business}
          feedbacks={feedbacks}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSaveBusiness={handleSaveBusiness}
          onFeedbacksChange={setFeedbacks}
          onClearFeedbacks={handleClearFeedbacks}
          onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
          onGoHome={() => navigateTo('/')}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // ROUTE: / (Customer Review Page - Clean, No Header, No Admin Leakage)
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-between font-roboto selection:bg-blue-100 selection:text-blue-900">
      {/* Main Review Dialog / Container styled like authentic Google Reviews */}
      <div className="flex-1 flex flex-col items-center justify-start sm:py-8 sm:px-4">
        <main className="w-full max-w-xl bg-white sm:rounded-3xl sm:shadow-lg sm:border sm:border-gray-200 overflow-hidden flex flex-col transition-all">
          {/* STEP 1: Main Google Review Interface (After QR Scan) */}
          {activeStep === 'form' && (
            <GoogleReviewForm
              business={business}
              rating={rating}
              onRatingChange={setRating}
              onProceed={handleStarSelect}
              reviewText={reviewText}
              onReviewTextChange={setReviewText}
            />
          )}

          {/* STEP 2: Less than or equal to 3 Stars (Stay in App, submit privately) */}
          {activeStep === 'low_feedback' && (
            <LowRatingFeedback
              rating={rating}
              onRatingChange={handleStarSelect}
              business={business}
              onSubmitFeedback={handleSubmitLowFeedback}
              onBack={handleReset}
            />
          )}
        </main>
      </div>

      {/* Clean Customer Footer (No Admin Links) */}
      <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200/60 bg-white sm:bg-transparent">
        <div className="flex items-center justify-center gap-2 text-2xs sm:text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Google Review Verified Flow · {business.businessName}</span>
        </div>
      </footer>
    </div>
  );
}
