import React, { useState, useEffect } from 'react';
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredFeedbacks,
  saveInternalFeedback,
} from './utils/storage';
import { getAuthenticatedUser, logoutAdmin } from './utils/auth';
import GoogleHeader from './components/GoogleHeader';
import GoogleReviewForm from './components/GoogleReviewForm';
import LowRatingFeedback from './components/LowRatingFeedback';
import HighRatingRedirect from './components/HighRatingRedirect';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import { QrCode, Lock, ShieldCheck, UserCheck, LogOut } from 'lucide-react';

export default function App() {
  const [business, setBusiness] = useState(getStoredSettings);
  const [feedbacks, setFeedbacks] = useState(getStoredFeedbacks);
  const [currentUser, setCurrentUser] = useState(getAuthenticatedUser);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  // Step state: 'form' | 'low_feedback' | 'high_redirect'
  const [activeStep, setActiveStep] = useState('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

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

  const handleStarSelect = (selectedRating) => {
    setRating(selectedRating);
    if (selectedRating <= 3) {
      // 1, 2, or 3 Stars -> Stay inside application for private feedback
      setActiveStep('low_feedback');
    } else {
      // 4 or 5 Stars -> Send directly to Google Reviews
      setActiveStep('high_redirect');
    }
  };

  const handleReset = () => {
    setRating(0);
    setReviewText('');
    setActiveStep('form');
  };

  const handleSubmitLowFeedback = (feedbackPayload) => {
    setIsSubmitting(true);
    const saved = saveInternalFeedback(feedbackPayload);
    setFeedbacks(getStoredFeedbacks());
    setIsSubmitting(false);
  };

  const handleSaveBusiness = (updatedSettings) => {
    setBusiness(updatedSettings);
    saveStoredSettings(updatedSettings);
  };

  // Open backend data protected area
  const handleOpenBackendData = () => {
    if (currentUser) {
      setShowAdmin(true);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    setShowAdmin(true);
  };

  const handleLogout = () => {
    logoutAdmin();
    setCurrentUser(null);
    setShowAdmin(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-between font-roboto selection:bg-blue-100 selection:text-blue-900">
      {/* Top Demo Simulation Bar with Access Gate */}
      <div className="bg-gray-900 text-gray-200 px-4 py-2 text-xs flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium hidden sm:inline">Google Review Experience</span>
          <span className="text-gray-400 text-2xs sm:text-xs">
            {activeStep === 'form' && '· Rate your experience'}
            {activeStep === 'low_feedback' && '· Share direct feedback'}
            {activeStep === 'high_redirect' && '· Verified Google Review'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenBackendData}
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 text-xs font-medium transition-colors cursor-pointer border border-blue-500/30"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Super Admin ({currentUser.email})</span>
              </button>
              <button
                onClick={handleLogout}
                type="button"
                title="Log out Super Admin"
                className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleOpenBackendData}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Super Admin Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Review Dialog / Container styled like authentic Google Reviews */}
      <div className="flex-1 flex flex-col items-center justify-start sm:py-6 sm:px-4">
        <main className="w-full max-w-xl bg-white sm:rounded-2xl sm:shadow-lg sm:border sm:border-gray-200 overflow-hidden flex flex-col transition-all">
          {/* Authentic Google Header */}
          <GoogleHeader
            onClose={handleReset}
            onReset={handleReset}
            rating={rating}
            canSubmit={activeStep === 'low_feedback' ? true : rating > 0}
            isSubmitting={isSubmitting}
            activeStep={activeStep}
            onSubmit={() => {
              if (activeStep === 'form') {
                if (rating <= 3) setActiveStep('low_feedback');
                else setActiveStep('high_redirect');
              } else if (activeStep === 'high_redirect') {
                window.open(business.googleReviewUrl, '_blank', 'noopener,noreferrer');
              }
            }}
          />

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

          {/* STEP 3: Greater than or equal to 4 Stars (Direct to Google Reviews) */}
          {activeStep === 'high_redirect' && (
            <HighRatingRedirect
              rating={rating}
              onRatingChange={handleStarSelect}
              business={business}
              userReviewText={reviewText}
              onBack={handleReset}
            />
          )}
        </main>
      </div>

      {/* Footer Branding & Security Lock Notice */}
      <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200/60 bg-white sm:bg-transparent">
        <div className="flex items-center justify-center gap-4 text-2xs sm:text-xs">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Google Review Smart Routing Protection</span>
          </span>
          <span>·</span>
          <button
            onClick={handleOpenBackendData}
            className="text-gray-600 hover:text-blue-600 hover:underline font-medium cursor-pointer flex items-center gap-1"
          >
            <Lock className="w-3 h-3 text-gray-400" />
            <span>
              {currentUser ? 'Open Admin Dashboard' : 'Backend Data (Authorized Personnel Only)'}
            </span>
          </button>
        </div>
      </footer>

      {/* Super Admin Login Modal */}
      {showLoginModal && (
        <AdminLogin
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* Protected Admin Panel (Accessible only when currentUser is verified) */}
      {showAdmin && currentUser && (
        <AdminPanel
          business={business}
          feedbacks={feedbacks}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSaveBusiness={handleSaveBusiness}
          onFeedbacksChange={setFeedbacks}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}
