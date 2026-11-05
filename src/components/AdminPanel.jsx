import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Inbox,
  Settings,
  Download,
  Trash2,
  ExternalLink,
  Save,
  CheckCircle,
  Copy,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Phone,
  Mail,
  Clock,
  Building,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { clearStoredFeedbacks } from '../utils/storage';

export default function AdminPanel({
  business,
  feedbacks,
  currentUser,
  onLogout,
  onSaveBusiness,
  onFeedbacksChange,
  onClearFeedbacks,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'inbox' | 'settings'
  const [settingsForm, setSettingsForm] = useState({ ...business });
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // The application URL for QR code
  const currentAppUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'http://192.168.0.112:5173';
  const [customQrUrl, setCustomQrUrl] = useState(currentAppUrl);
  const [lanUrl, setLanUrl] = useState('');

  // Fetch local network IP for reliable mobile QR scanning
  useEffect(() => {
    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.mobileUrl) {
          setLanUrl(data.mobileUrl);
          // If current URL is localhost or 127.0.0.1, auto-replace with actual Wi-Fi LAN IP
          if (customQrUrl.includes('localhost') || customQrUrl.includes('127.0.0.1')) {
            setCustomQrUrl(data.mobileUrl);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    onSaveBusiness(settingsForm);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(customQrUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById('business-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 100, 100, 800, 800);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${settingsForm.businessName.replace(/\s+/g, '-').toLowerCase()}-google-review-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleClearInbox = async () => {
    if (window.confirm('Are you sure you want to delete all feedback records from database?')) {
      if (onClearFeedbacks) {
        await onClearFeedbacks();
      } else {
        clearStoredFeedbacks();
        onFeedbacksChange([]);
      }
    }
  };

  const handleExportCSV = () => {
    if (feedbacks.length === 0) return;
    const headers = ['Date', 'Rating', 'Ticket ID', 'Customer Name', 'Contact', 'Issues', 'Feedback', 'Status'];
    const rows = feedbacks.map((fb) => [
      new Date(fb.createdAt).toLocaleString(),
      fb.rating,
      fb.ticketId || '',
      `"${(fb.customerName || '').replace(/"/g, '""')}"`,
      `"${(fb.customerContact || '').replace(/"/g, '""')}"`,
      `"${(fb.issues || []).join('; ')}"`,
      `"${(fb.feedbackText || '').replace(/"/g, '""')}"`,
      fb.status || 'Pending',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_feedbacks_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-scaleUp">
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-google font-bold text-lg text-white">
                  Super Admin Dashboard
                </h3>
                <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Authorized</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-2xs font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  SQLite: reviews.sqlite
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Logged in as: <strong className="text-gray-200">{currentUser?.email || 'info@veltron.in'}</strong> ({currentUser?.role || 'Super Admin'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-colors cursor-pointer"
              title="Lock backend and sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 flex gap-2 sm:gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('qr')}
            className={`py-3 px-2 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'qr'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code & Stand</span>
          </button>

          <button
            onClick={() => setActiveTab('inbox')}
            className={`py-3 px-2 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'inbox'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Private Feedback Inbox ({feedbacks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-2 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Google Review Link & Config</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: QR CODE */}
          {activeTab === 'qr' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Visual Table Tent Preview */}
                <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200 text-center flex flex-col items-center shadow-inner">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Review Us on Google</span>
                  </div>

                  <h4 className="font-google font-bold text-gray-900 text-base mb-1">
                    {business.businessName}
                  </h4>
                  <p className="text-2xs text-gray-500 mb-4">
                    Scan with your phone camera to leave a quick review
                  </p>

                  <div className="bg-white p-3.5 rounded-2xl shadow-md border border-gray-200 mb-3">
                    <QRCodeSVG
                      id="business-qr-svg"
                      value={customQrUrl}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="flex items-center gap-1 text-[#fa7b17] text-xs font-medium">
                    ★★★★★
                    <span className="text-gray-600 ml-1">Rate your experience</span>
                  </div>
                </div>

                {/* QR Controls */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">
                      Target QR Code URL
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">
                      When a customer scans this QR code at your checkout counter, tables, or receipt, it immediately opens this review flow.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={customQrUrl}
                        onChange={(e) => setCustomQrUrl(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <button
                        onClick={handleCopyLink}
                        type="button"
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 text-xs flex items-center gap-1 cursor-pointer"
                        title="Copy link"
                      >
                        {copiedLink ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Quick preset helpers */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {lanUrl && (
                        <button
                          type="button"
                          onClick={() => setCustomQrUrl(lanUrl)}
                          className={`text-2xs px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer ${
                            customQrUrl === lanUrl
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          📱 Phone Wi-Fi URL: {lanUrl}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCustomQrUrl('http://127.0.0.1:5173')}
                        className={`text-2xs px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer ${
                          customQrUrl.includes('127.0.0.1')
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        💻 Localhost
                      </button>
                    </div>

                    {/* Phone scan tip */}
                    <p className="text-2xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                      <strong>📱 Mobile Phone Tip:</strong> Phones cannot open <code className="bg-amber-100 px-1 rounded">127.0.0.1</code> or <code className="bg-amber-100 px-1 rounded">localhost</code> because that points to the phone itself. Keep your phone connected to the same Wi-Fi and use the <code className="bg-amber-100 px-1 rounded">http://192.168.0.112:5173</code> URL above.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-950 space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>⚡ How the Smart Review Filter works:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-2xs sm:text-xs">
                      <li><strong>Customer selects 4 or 5 Stars:</strong> Automatically routed to your authentic Google Review page to post a public 5-star review!</li>
                      <li><strong>Customer selects 1, 2, or 3 Stars:</strong> Kept safely inside this application. Their complaint is forwarded directly to your Private Feedback Inbox without hitting Google.</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleDownloadQR}
                      type="button"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download High-Res QR Code (PNG)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVATE FEEDBACK INBOX */}
          {activeTab === 'inbox' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Internal Negative Feedback (1-3 Stars Protected)
                  </h4>
                  <p className="text-xs text-gray-500">
                    These ratings were intercepted in-app and NOT posted to Google Reviews.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {feedbacks.length > 0 && (
                    <>
                      <button
                        onClick={handleExportCSV}
                        type="button"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={handleClearInbox}
                        type="button"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {feedbacks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-medium text-gray-700">No negative reviews logged yet!</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    When someone submits a 1, 2, or 3-star rating, it will show up here privately so you can resolve it with the customer before they write on Google.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-100 text-amber-800 border border-amber-200">
                            ★ {item.rating} Stars
                          </span>
                          <span className="text-xs font-semibold text-gray-800">
                            {item.customerName || 'Anonymous Customer'}
                          </span>
                          <span className="text-2xs text-gray-400 font-mono">
                            #{item.ticketId}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-2xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Customer Contact */}
                      {item.customerContact && item.customerContact !== 'Not provided' && (
                        <div className="text-xs text-blue-700 bg-blue-50/70 p-2 rounded-lg mb-2 flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-medium">Customer Contact:</span>
                          <span>{item.customerContact}</span>
                        </div>
                      )}

                      {/* Issues badges */}
                      {item.issues && item.issues.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {item.issues.map((issue, idx) => (
                            <span
                              key={idx}
                              className="text-2xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Comments */}
                      <p className="text-xs text-gray-700 bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                        "{item.feedbackText || 'No extra written notes provided.'}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.businessName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, businessName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category (e.g. Italian Restaurant, Dental Clinic)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.businessCategory}
                    onChange={(e) => setSettingsForm({ ...settingsForm, businessCategory: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full Business Address
                </label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Google Review Direct URL (Target for 4-5 Stars) <span className="text-red-500">*</span>
                  </label>
                  <a
                    href="https://support.google.com/business/answer/7035772"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>How to find your Place ID?</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="url"
                  required
                  value={settingsForm.googleReviewUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, googleReviewUrl: e.target.value })}
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-2xs text-gray-400 mt-1">
                  This is the exact Google Maps URL where users who give 4 or 5 stars will be redirected.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Manager Alert Email
                  </label>
                  <input
                    type="email"
                    value={settingsForm.managerEmail}
                    onChange={(e) => setSettingsForm({ ...settingsForm, managerEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Manager Phone
                  </label>
                  <input
                    type="text"
                    value={settingsForm.managerPhone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, managerPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-gray-200">
                {savedNotice && (
                  <span className="text-xs text-green-700 font-medium flex items-center gap-1 animate-fadeIn">
                    <CheckCircle className="w-4 h-4" />
                    <span>Settings saved successfully!</span>
                  </span>
                )}
                <div className="ml-auto">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs sm:text-sm font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

