import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle, X, KeyRound, Building2, Store } from 'lucide-react';
import { apiLogin } from '../utils/api';

export default function AdminLogin({
  onLoginSuccess,
  onClose,
  isStandalonePage = false,
  isOwnerPage = false,
  onGoHome,
  onNavigate,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await apiLogin(email, password, rememberMe);
      setIsLoading(false);
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error);
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Server connection error. Please try again.');
    }
  };

  return (
    <div className={isStandalonePage ? "min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-purple-600 selection:text-white" : "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 overflow-hidden animate-scaleUp">
        {/* Top Header */}
        <div className={`p-6 relative text-white ${isOwnerPage ? 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900' : 'bg-gray-900'}`}>
          {onClose && !isStandalonePage && (
            <button
              onClick={onClose}
              type="button"
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
              isOwnerPage
                ? 'bg-purple-600/30 border border-purple-400/40 text-purple-300'
                : 'bg-blue-600/30 border border-blue-400/40 text-blue-400'
            }`}>
              {isOwnerPage ? <Building2 className="w-6 h-6" /> : <Store className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-google font-bold text-lg text-white">
                {isOwnerPage ? 'Product Owner Portal' : 'Store Manager Portal'}
              </h3>
              <p className="text-xs text-gray-300">
                {isOwnerPage ? 'Multi-Tenant Platform Control' : 'QR Stand & Feedback Inbox Access'}
              </p>
            </div>
          </div>
          <p className="text-2xs text-gray-300 mt-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            {isOwnerPage
              ? 'Authorized Product Owner only: Manage all tenants, Google Review configs, and store manager credentials.'
              : 'Authorized store manager only: View customer QR code stand and private feedback inbox.'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isOwnerPage ? 'Product Owner Email' : 'Store Manager Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder={isOwnerPage ? 'owner@veltron.in' : 'info@veltron.in'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                />
                <span>Remember this session</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 text-white font-medium text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
                  isOwnerPage
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                    : 'bg-gray-900 hover:bg-black'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{isOwnerPage ? 'Enter Product Owner Portal' : 'Enter Store Portal'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Role switchers / navigation */}
            <div className="pt-2 flex flex-col items-center gap-1.5 text-center text-xs text-gray-500">
              {onNavigate && isOwnerPage && (
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="text-gray-600 hover:text-gray-900 hover:underline cursor-pointer font-medium"
                >
                  Looking for Store Manager Login? Click here (/login) →
                </button>
              )}

              {isStandalonePage && onGoHome && (
                <button
                  type="button"
                  onClick={onGoHome}
                  className="text-gray-400 hover:text-gray-700 hover:underline cursor-pointer inline-flex items-center gap-1 text-2xs pt-1"
                >
                  <span>← Return to Customer Review Page</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
