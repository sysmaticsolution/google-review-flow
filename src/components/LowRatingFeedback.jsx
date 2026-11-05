import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, HeartHandshake, Send, ArrowLeft } from 'lucide-react';
import StarRating from './StarRating';

const IMPROVEMENT_AREAS = [
  'Wait time / Speed',
  'Staff friendliness',
  'Quality of service',
  'Cleanliness & hygiene',
  'Pricing / Value',
  'Order accuracy',
  'Communication',
  'Noise / Atmosphere',
];

export default function LowRatingFeedback({
  rating,
  onRatingChange,
  business,
  onSubmitFeedback,
  onBack,
}) {
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [wantFollowUp, setWantFollowUp] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const toggleIssue = (issue) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const generatedTicket = 'REF-' + Math.floor(100000 + Math.random() * 900000);
    setTicketId(generatedTicket);

    const feedbackPayload = {
      ticketId: generatedTicket,
      rating,
      businessName: business.businessName,
      issues: selectedIssues,
      feedbackText,
      customerName: customerName.trim() || 'Anonymous Customer',
      customerContact: customerContact.trim() || 'Not provided',
      wantFollowUp,
      status: 'Pending Review',
    };

    onSubmitFeedback(feedbackPayload);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="p-6 sm:p-8 flex flex-col items-center text-center max-w-lg mx-auto animate-fadeIn">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
          <HeartHandshake className="w-8 h-8 text-[#1a73e8]" />
        </div>

        <h3 className="font-google text-2xl font-bold text-gray-900 mb-2">
          Thank you for your candid feedback
        </h3>

        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          We sincerely apologize that your visit didn't meet our standards. 
          Your message has been directly submitted to the management team of{' '}
          <span className="font-semibold text-gray-800">{business.businessName}</span>.
          {wantFollowUp && customerContact && (
            <span className="block mt-2 text-blue-700 bg-blue-50 p-2 rounded-lg text-xs font-medium">
              Our team will review your notes and reach out to {customerContact} to make things right.
            </span>
          )}
        </p>

        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-left mb-6 text-xs text-gray-600 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-400">Rating provided:</span>
            <span className="font-medium text-amber-600 font-semibold">{rating} of 5 Stars</span>
          </div>
          {selectedIssues.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Reported issues:</span>
              <span className="font-medium text-gray-700 text-right">{selectedIssues.join(', ')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Destination:</span>
            <span className="text-green-700 font-medium">Delivered to General Management</span>
          </div>
        </div>

        <button
          onClick={onBack}
          type="button"
          className="w-full sm:w-auto px-6 py-2.5 rounded-full font-medium text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      {/* Top note */}
      <div className="flex items-start gap-3 bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5 mb-6 text-blue-950">
        <HeartHandshake className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <span className="font-semibold">Direct Management Feedback:</span> We strive for 100% guest satisfaction. Please share your details below so our management can address this directly with you.
        </div>
      </div>

      {/* Rating summary */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 flex flex-col items-center">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">
          Your Rating
        </span>
        <StarRating rating={rating} onRatingChange={onRatingChange} size="md" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Issue Chips */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-2">
            What areas could we have done better? <span className="text-gray-400 text-xs font-normal">(Select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {IMPROVEMENT_AREAS.map((issue) => {
              const active = selectedIssues.includes(issue);
              return (
                <button
                  key={issue}
                  type="button"
                  onClick={() => toggleIssue(issue)}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                    active
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {issue}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Comments */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">
            Tell us more about your experience <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Please describe what happened. What could our staff have done differently to give you a 5-star experience?"
            className="w-full p-3.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all placeholder:text-gray-400 bg-white"
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {feedbackText.length} characters
          </div>
        </div>

        {/* Contact Resolution */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              Would you like the manager to contact you?
            </span>
            <input
              type="checkbox"
              id="wantFollowUp"
              checked={wantFollowUp}
              onChange={(e) => setWantFollowUp(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {wantFollowUp && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fadeIn">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Miller"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone or Email
                </label>
                <input
                  type="text"
                  placeholder="e.g. alex@example.com or phone"
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Rating</span>
          </button>

          <button
            type="submit"
            disabled={!feedbackText.trim()}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm ${
              feedbackText.trim()
                ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white cursor-pointer active:scale-98'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Submit Feedback</span>
          </button>
        </div>
      </form>
    </div>
  );
}

