import React, { useState, useEffect } from 'react';
import {
  apiFetchSettings,
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
import ProductOwnerDashboard from './components/ProductOwnerDashboard';
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

  // Router: support /, /login, and /owner
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

  const isOwnerRoute = currentPath === '/owner' || currentPath.startsWith('/owner');
  const isLoginRoute = currentPath === '/login' || currentPath === '/admin' || currentPath.startsWith('/login');

  // Load tenant settings on mount (supports ?tenant=<slug> for multi-tenant customer page)
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams(window.location.search);
    const tenantParam = params.get('tenant') || params.get('tenantId');

    apiFetchSettings(tenantParam)
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

  // Fetch feedbacks whenever authenticated
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

  // Check URL params for quick testing
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
      // > 3 rating (4 or 5 Stars) -> Directly open authentic Google Review page immediately!
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
      // Attach tenant id if not already present
      const payloadWithTenant = {
        tenantId: business.id || 'loop',
        ...feedbackPayload,
      };

      // 1. Submit to SQLite backend
      const saved = await apiSubmitFeedback(payloadWithTenant);
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

    // Role-based route redirection
    if (user.role === 'product_owner') {
      navigateTo('/owner');
    } else {
      navigateTo('/login');
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
  };

  // -------------------------------------------------------------------------
  // ROUTE 1: /owner (Dedicated Product Owner Multi-Tenant Master Portal)
  // -------------------------------------------------------------------------
  if (isOwnerRoute) {
    if (!currentUser) {
      return (
        <AdminLogin
          isStandalonePage={true}
          isOwnerPage={true}
          onLoginSuccess={handleLoginSuccess}
          onGoHome={() => navigateTo('/')}
          onNavigate={navigateTo}
        />
      );
    }

    // If a Store Manager logged in while at /owner, allow switching to /login
    if (currentUser.role !== 'product_owner') {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Store Manager Detected</h3>
            <p className="text-xs text-slate-400 mb-6">
              You are logged in as a Store Manager ({currentUser.email}). The Product Owner Master portal requires master credentials.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigateTo('/login')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Go to Store Manager Portal (/login)
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ProductOwnerDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        onGoHome={() => navigateTo('/')}
      />
    );
  }

  // -------------------------------------------------------------------------
  // ROUTE 2: /login (Dedicated Store Manager Portal - ONLY 2 TABS)
  // -------------------------------------------------------------------------
  if (isLoginRoute) {
    if (!currentUser) {
      return (
        <AdminLogin
          isStandalonePage={true}
          isOwnerPage={false}
          onLoginSuccess={handleLoginSuccess}
          onGoHome={() => navigateTo('/')}
          onNavigate={navigateTo}
        />
      );
    }

    // If Product Owner lands on /login, redirect or render Product Owner Dashboard
    if (currentUser.role === 'product_owner') {
      return (
        <ProductOwnerDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          onGoHome={() => navigateTo('/')}
        />
      );
    }

    // Store Manager / Tenant Admin gets ONLY the 2 tabs:
    // 1) QR Code & Stand
    // 2) Private Feedback Inbox
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-6 selection:bg-blue-500 selection:text-white">
        <AdminPanel
          business={business}
          feedbacks={feedbacks}
          currentUser={currentUser}
          onLogout={handleLogout}
          onFeedbacksChange={setFeedbacks}
          onClearFeedbacks={handleClearFeedbacks}
          onGoHome={() => navigateTo('/')}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // ROUTE 3: / (Public Customer Review Page - Clean, No Header, No Admin Leakage)
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
