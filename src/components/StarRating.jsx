import React, { useState } from 'react';

const STAR_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export default function StarRating({ rating, onRatingChange, size = 'lg', disabled = false }) {
  const [hoverRating, setHoverRating] = useState(0);

  const activeRating = hoverRating || rating;

  const starSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-11 h-11 sm:w-12 sm:h-12',
  }[size];

  return (
    <div className="flex flex-col items-center select-none">
      <div 
        className="flex items-center gap-2 sm:gap-3"
        onMouseLeave={() => setHoverRating(0)}
      >
        {[1, 2, 3, 4, 5].map((starValue) => {
          const isFilled = starValue <= activeRating;
          return (
            <button
              key={starValue}
              type="button"
              disabled={disabled}
              onClick={() => onRatingChange(starValue)}
              onMouseEnter={() => setHoverRating(starValue)}
              aria-label={`${starValue} star rating: ${STAR_LABELS[starValue]}`}
              className={`p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full transition-transform active:scale-90 ${
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-115'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`${starSizeClasses} transition-colors duration-150 ${
                  isFilled ? 'text-[#fa7b17] drop-shadow-sm' : 'text-gray-300 hover:text-gray-400'
                }`}
                fill={isFilled ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isFilled ? '0.5' : '1.5'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Dynamic Star description text */}
      <div className="h-6 mt-2 flex items-center justify-center">
        {activeRating > 0 ? (
          <span className="text-sm sm:text-base font-medium text-gray-700 animate-fadeIn transition-opacity">
            {STAR_LABELS[activeRating]}
          </span>
        ) : (
          <span className="text-xs sm:text-sm text-gray-400">
            Click to rate your experience
          </span>
        )}
      </div>
    </div>
  );
}

