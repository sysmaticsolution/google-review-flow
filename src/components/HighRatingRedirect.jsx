import React, { useEffect, useState } from 'react';
import { ExternalLink, Check, Copy, Sparkles, Star, ArrowLeft, ArrowUpRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import StarRating from './StarRating';

export default function HighRatingRedirect({
  rating,
  onRatingChange,
  business,
  userReviewText,
  onBack,
}) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(business.redirectDelaySeconds || 3);
  const [redirectCancelled, setRedirectCancelled] = useState(false);

  // Trigger confetti burst on positive rating mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
      });
    } catch (e) {
      // fallback if canvas not available
    }
  }, []);

  // Countdown timer for automatic transition
  useEffect(() => {
    if (!business.autoRedirectPositive || redirectCancelled) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      handleOpenGoogle();
    }
  }, [countdown, business.autoRedirectPositive, redirectCancelled]);

  const handleOpenGoogle = () => {
    const url = business.googleReviewUrl || 'https://search.google.com/local/writereview';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyReview = () => {
    if (userReviewText) {
      navigator.clipboard.writeText(userReviewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto animate-fadeIn">
      {/* Celebration Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 text-amber-500 rounded-full mb-3 ring-8 ring-amber-50/50">
          <Sparkles className="w-7 h-7 text-[#fa7b17]" />
        </div>
        <h3 className="font-google text-2xl font-bold text-gray-900">
          Thank you for the {rating}-Star rating!
        </h3>
        <p className="text-gray-600 text-sm mt-1 max-w-md mx-auto">
          Reviews on Google help independent businesses like ours thrive. We're redirecting you directly to our official Google Review page.
        </p>
      </div>

      {/* Google Preview Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500" />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Official Google Business Profile
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Verified
          </span>
        </div>

        <div className="flex items-center gap-3.5 mb-3">
          <img
            src={business.avatarUrl}
            alt={business.businessName}
            className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-xs"
          />
          <div>
            <h4 className="font-google font-bold text-gray-900 text-base">
              {business.businessName}
            </h4>
            <p className="text-xs text-gray-500">{business.address}</p>
          </div>
        </div>

        {/* Selected Rating */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">Your Google Rating:</span>
          <div className="flex items-center gap-1 text-[#fa7b17]">
            {[...Array(rating)].map((_, i) => (
              <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            <span className="text-sm font-bold ml-1 text-gray-800">{rating}.0</span>
          </div>
        </div>

        {userReviewText && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700">
            <div className="flex items-center justify-between mb-1 text-gray-500 font-medium">
              <span>Your Drafted Review:</span>
              <button
                type="button"
                onClick={handleCopyReview}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy to Paste'}</span>
              </button>
            </div>
            <p className="italic">"{userReviewText}"</p>
          </div>
        )}
      </div>

      {/* Auto Redirect Banner */}
      {business.autoRedirectPositive && !redirectCancelled && countdown > 0 && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
            <span>
              Opening Google Reviews in <strong>{countdown}s</strong>...
            </span>
          </div>
          <button
            onClick={() => setRedirectCancelled(true)}
            className="text-blue-700 hover:underline font-medium cursor-pointer"
          >
            Cancel auto-open
          </button>
        </div>
      )}

      {/* Primary Google Button */}
      <div className="space-y-3">
        <button
          onClick={handleOpenGoogle}
          type="button"
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-full font-medium text-sm sm:text-base bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-md hover:shadow-lg transition-all transform active:scale-98 cursor-pointer"
        >
          <span>Continue & Post on Google</span>
          <ArrowUpRight className="w-5 h-5" />
        </button>

        <p className="text-center text-xs text-gray-400">
          Opens our official Google Review dialog in a secure new tab.
        </p>

        <div className="pt-3 flex justify-center">
          <button
            onClick={onBack}
            type="button"
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change my rating</span>
          </button>
        </div>
      </div>
    </div>
  );
}

