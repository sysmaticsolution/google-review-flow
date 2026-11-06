import React, { useState } from 'react';
import { Camera, Info, ShieldCheck, MapPin, Check, Sparkles } from 'lucide-react';
import StarRating from './StarRating';

const VISIT_TYPES = ['Dine in', 'Takeout', 'Late Night Bites', 'Delivery'];
const QUICK_TAGS = ['Cold Brew & Shakes', 'Quick Bites', 'Neon Vibe & Music', 'Friendly Staff', 'Fast Service', 'Value for Money'];

export default function GoogleReviewForm({
  business,
  rating,
  onRatingChange,
  onProceed,
  reviewText,
  onReviewTextChange,
}) {
  const [selectedVisitType, setSelectedVisitType] = useState('Dine in');
  const [selectedTags, setSelectedTags] = useState([]);
  const [userName, setUserName] = useState('Google Reviewer');

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleStarSelect = (newRating) => {
    onRatingChange(newRating);
    // Instant smooth transition or user can tap "Post" button
    // User requested: "if user provide less than 3star then it should stay in our application... if user selected greater then 4 star then the review should go to the google review directly"
    onProceed(newRating);
  };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 animate-fadeIn">
      {/* Business Hero Banner & Identity */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white mb-6 shadow-sm">
        <div className="h-36 sm:h-44 w-full overflow-hidden relative bg-gray-900">
          <img
            src={business.coverPhoto}
            alt={business.businessName}
            className="w-full h-full object-cover object-[center_28%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-white text-xs">
            <span className="flex items-center gap-1 font-medium drop-shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>{business.address}</span>
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 pt-3">
          <div className="flex items-start gap-3.5 -mt-10 sm:-mt-12 mb-3">
            <img
              src={business.avatarUrl || business.coverPhoto || '/images/loop-avatar.jpg'}
              alt={business.businessName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white shrink-0"
              onError={(e) => {
                e.target.src = business.coverPhoto || '/images/loop-avatar.jpg';
              }}
            />
            <div className="pt-7 sm:pt-9 min-w-0 flex-1">
              <h2 className="font-google font-bold text-gray-900 text-lg sm:text-xl truncate">
                {business.businessName}
              </h2>
              <p className="text-xs text-gray-500 truncate">{business.businessCategory}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
            <div className="flex items-center text-[#fa7b17] font-bold">
              <span>{business.currentGoogleRating}</span>
              <div className="flex ml-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
            </div>
            <span className="text-gray-300">·</span>
            <span>({business.totalGoogleReviews} Google reviews)</span>
          </div>
        </div>
      </div>

      {/* Google User Identity Line */}
      <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl mb-6 shadow-2xs">
        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-sm font-medium text-gray-800 truncate">{userName}</span>
            <span className="text-2xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-100">
              Google Verified
            </span>
          </div>
          <p className="text-2xs text-gray-500 flex items-center gap-1 mt-0.5">
            <ShieldCheck className="w-3 h-3 text-green-600" />
            <span>Posting publicly across Google Search & Maps</span>
          </p>
        </div>
      </div>

      {/* Central Star Rating Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center mb-6">
        <h3 className="font-google font-medium text-gray-900 text-base sm:text-lg mb-1">
          How was your experience?
        </h3>
        <p className="text-xs text-gray-500 mb-5">
          Tap the stars below to rate {business.businessName}
        </p>

        <div className="py-2">
          <StarRating
            rating={rating}
            onRatingChange={handleStarSelect}
            size="lg"
          />
        </div>
      </div>

      {/* Optional Details (Google Style) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Service Type
          </label>
          <div className="flex flex-wrap gap-2">
            {VISIT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedVisitType(type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  selectedVisitType === type
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            What stood out?
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    isSelected
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Share details of your experience (Optional)
          </label>
          <textarea
            rows={3}
            value={reviewText}
            onChange={(e) => onReviewTextChange(e.target.value)}
            placeholder="Share details of your own experience at this place (food, service, atmosphere)..."
            className="w-full p-3 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent placeholder:text-gray-400 bg-gray-50 focus:bg-white transition-colors"
          />
        </div>

        {/* Photo attachment placeholder (Google style) */}
        <div className="border border-dashed border-gray-300 rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors">
          <Camera className="w-4 h-4 text-gray-400" />
          <span>Add photos & videos</span>
        </div>
      </div>
    </div>
  );
}

