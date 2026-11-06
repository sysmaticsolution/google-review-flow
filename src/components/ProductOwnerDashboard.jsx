import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Users,
  Inbox,
  KeyRound,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  CheckCircle,
  Save,
  LogOut,
  ShieldCheck,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  FileSpreadsheet,
  X,
  Eye,
  EyeOff,
  Store,
  Layers,
  Sparkles,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import {
  apiFetchOwnerTenants,
  apiCreateOwnerTenant,
  apiUpdateOwnerTenant,
  apiDeleteOwnerTenant,
  apiUpdateOwnerCredentials,
  apiFetchFeedbacks,
  apiClearFeedbacks,
  apiUploadImage,
} from '../utils/api';

function ImageUploadField({ label, value, onChange, placeholder = 'Upload Image', isBanner = false, namePrefix = 'image' }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP, SVG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large (maximum 10MB)');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      onChange(base64); // Show instant local preview

      try {
        const uploadedUrl = await apiUploadImage(base64, namePrefix);
        if (uploadedUrl) {
          onChange(uploadedUrl);
        }
      } catch (err) {
        console.warn('Backend image upload fallback to base64:', err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="block font-semibold text-slate-300 mb-1.5 text-xs">{label}</label>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {value ? (
        <div className={`relative group border border-slate-700/80 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center ${
          isBanner ? 'h-24 w-full' : 'h-24 w-24'
        }`}>
          <img
            src={value}
            alt={label}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = '/images/loop-avatar.jpg';
            }}
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xs">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-2xs cursor-pointer shadow-md flex items-center gap-1"
              title="Change Image"
            >
              <Upload className="w-3 h-3" />
              <span>Change</span>
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-2xs cursor-pointer shadow-md"
              title="Remove Image"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl bg-slate-950/60 hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-purple-300 cursor-pointer p-3 ${
            isBanner ? 'w-full h-24' : 'w-24 h-24'
          }`}
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-5 h-5 opacity-70 text-purple-400" />
              <span className="text-2xs font-medium text-center leading-tight">
                {placeholder}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function ProductOwnerDashboard({
  currentUser,
  onLogout,
  onGoHome,
}) {
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'feedbacks' | 'security'
  const [tenants, setTenants] = useState([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState('all');
  const [copiedSlug, setCopiedSlug] = useState(null);

  // Modal State for Add Tenant
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
    name: '',
    slug: '',
    category: 'Café & Restaurant',
    address: '',
    googleReviewUrl: '',
    avatarUrl: '/images/loop-avatar.jpg',
    coverPhoto: '/images/loop-cover.jpg',
    managerEmail: '',
    managerPassword: 'password123',
    managerPhone: '',
  });
  const [addTenantError, setAddTenantError] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Modal State for Edit Tenant (Google Review Link & Config + Manager Credentials)
  const [editingTenant, setEditingTenant] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    address: '',
    googleReviewUrl: '',
    avatarUrl: '',
    coverPhoto: '',
    managerEmail: '',
    managerPassword: '',
    managerPhone: '',
  });
  const [editSuccessNotice, setEditSuccessNotice] = useState('');
  const [editErrorNotice, setEditErrorNotice] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Product Owner Credentials State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState(currentUser?.email || 'owner@veltron.in');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Fetch all tenants on mount
  const loadTenants = async () => {
    setIsLoadingTenants(true);
    try {
      const data = await apiFetchOwnerTenants();
      if (Array.isArray(data)) {
        setTenants(data);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  // Fetch all feedbacks
  const loadFeedbacks = async () => {
    try {
      const data = await apiFetchFeedbacks();
      if (Array.isArray(data)) {
        setFeedbacks(data);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    }
  };

  useEffect(() => {
    loadTenants();
    loadFeedbacks();
  }, []);

  const getTenantReviewUrl = (slug) => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      return `${origin}/?tenant=${slug}`;
    }
    return '';
  };

  const handleCopyReviewUrl = (slug) => {
    const url = getTenantReviewUrl(slug);
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Auto-generate slug when name changes in Add Tenant modal
  const handleNameChange = (val) => {
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setNewTenantForm((prev) => ({
      ...prev,
      name: val,
      slug: prev.slug === '' || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug,
      managerEmail: prev.managerEmail === '' || prev.managerEmail.includes('@') ? (autoSlug ? `manager@${autoSlug}.com` : '') : prev.managerEmail,
    }));
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setAddTenantError('');
    setIsSubmittingAdd(true);

    try {
      if (!newTenantForm.name || !newTenantForm.googleReviewUrl) {
        setAddTenantError('Business Name and Google Review URL are required.');
        setIsSubmittingAdd(false);
        return;
      }

      await apiCreateOwnerTenant(newTenantForm);
      await loadTenants();
      setShowAddModal(false);
      setNewTenantForm({
        name: '',
        slug: '',
        category: 'Café & Restaurant',
        address: '',
        googleReviewUrl: '',
        avatarUrl: '/images/loop-avatar.jpg',
        coverPhoto: '/images/loop-cover.jpg',
        managerEmail: '',
        managerPassword: 'password123',
        managerPhone: '',
      });
    } catch (err) {
      setAddTenantError(err.message || 'Failed to create tenant.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.businessName || '',
      category: tenant.businessCategory || '',
      address: tenant.address || '',
      googleReviewUrl: tenant.googleReviewUrl || '',
      avatarUrl: tenant.avatarUrl || '',
      coverPhoto: tenant.coverPhoto || '',
      managerEmail: tenant.adminEmail || tenant.managerEmail || '',
      managerPassword: '',
      managerPhone: tenant.managerPhone || '',
    });
    setEditSuccessNotice('');
    setEditErrorNotice('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTenant) return;
    setIsSubmittingEdit(true);
    setEditErrorNotice('');
    setEditSuccessNotice('');

    try {
      await apiUpdateOwnerTenant(editingTenant.id, editForm);
      await loadTenants();
      setEditSuccessNotice('Tenant configuration & credentials updated successfully!');
      setTimeout(() => {
        setEditingTenant(null);
      }, 1500);
    } catch (err) {
      setEditErrorNotice(err.message || 'Failed to update tenant');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    if (window.confirm(`Are you sure you want to permanently delete tenant "${tenantId}" and all its feedback records?`)) {
      try {
        await apiDeleteOwnerTenant(tenantId);
        await loadTenants();
        await loadFeedbacks();
      } catch (err) {
        alert(err.message || 'Failed to delete tenant');
      }
    }
  };

  const handleClearInbox = async () => {
    const promptText = selectedTenantFilter === 'all'
      ? 'Are you sure you want to delete all feedback records from database across ALL tenants?'
      : `Are you sure you want to delete all feedback records for tenant '${selectedTenantFilter}' from database?`;
    
    if (window.confirm(promptText)) {
      try {
        await apiClearFeedbacks();
        await loadFeedbacks();
      } catch (err) {
        alert(err.message || 'Failed to clear feedbacks');
      }
    }
  };

  const handleExportCSV = () => {
    const list = filteredFeedbacks;
    if (list.length === 0) return;
    const headers = ['Date', 'Tenant', 'Rating', 'Ticket ID', 'Customer Name', 'Contact', 'Issues', 'Feedback', 'Status'];
    const rows = list.map((fb) => [
      new Date(fb.createdAt).toLocaleString(),
      fb.tenantId || 'loop',
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
    link.setAttribute('download', `veltron_feedbacks_${selectedTenantFilter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateOwnerCreds = async (e) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    if (!currentPassword) {
      setCredError('Please enter your current password to authorize changes.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setCredError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setCredError('New passwords do not match. Please re-enter.');
      return;
    }

    setIsSavingCreds(true);
    try {
      await apiUpdateOwnerCredentials({
        currentPassword,
        newEmail,
        newPassword: newPassword || undefined,
      });

      setIsSavingCreds(false);
      setCredSuccess('Product Owner credentials updated successfully in database!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setCredSuccess(''), 4000);
    } catch (err) {
      setIsSavingCreds(false);
      setCredError(err.message || 'Failed to update credentials. Please check current password.');
    }
  };

  const filteredFeedbacks = selectedTenantFilter === 'all'
    ? feedbacks
    : feedbacks.filter((fb) => fb.tenantId === selectedTenantFilter);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-roboto selection:bg-purple-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-google font-bold text-base sm:text-lg text-white">
                Veltron Product Owner Portal
              </h1>
              <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Multi-Tenant Master
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Master control for all client Google Review links, configurations & store manager credentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client / Tenant</span>
          </button>

          {onGoHome && (
            <button
              onClick={onGoHome}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <span>Customer Flow (/)</span>
            </button>
          )}

          <button
            onClick={onLogout}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-8 flex gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'tenants'
              ? 'border-purple-500 text-purple-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tenants & Google Review Config ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('feedbacks')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'feedbacks'
              ? 'border-purple-500 text-purple-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Private Feedbacks Stream ({feedbacks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'security'
              ? 'border-purple-500 text-purple-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Product Owner Security</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
        {/* ========================================================================= */}
        {/* TAB 1: MULTI-TENANT MANAGEMENT (Google Review Link & Config + Manager Creds) */}
        {/* ========================================================================= */}
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Registered Client Businesses</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-purple-300 font-mono">
                    {tenants.length} Active Tenants
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Each client gets an isolated Google Review link, custom branding, QR stand, and dedicated store manager credentials.
                </p>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Tenant / Business</span>
              </button>
            </div>

            {isLoadingTenants ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">Loading multi-tenant configurations...</p>
              </div>
            ) : tenants.length === 0 ? (
              <div className="py-16 text-center bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No client tenants configured yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Add your first client business to generate their Google Review link and manager credentials.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  type="button"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  Create First Tenant
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {tenants.map((t) => {
                  const reviewUrl = getTenantReviewUrl(t.id);
                  const isCopied = copiedSlug === t.id;

                  return (
                    <div
                      key={t.id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Tenant Top Bar */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            {t.coverPhoto ? (
                              <img
                                src={t.coverPhoto}
                                alt={t.businessName}
                                className="w-12 h-12 rounded-2xl object-cover bg-slate-800 border border-slate-700 shadow-sm"
                                onError={(e) => {
                                  e.target.src = '/images/loop-cover.jpg';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
                                <Store className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-google font-bold text-base text-white">
                                  {t.businessName}
                                </h3>
                              </div>
                              <p className="text-xs text-slate-400">
                                {t.businessCategory || 'Café & Restaurant'} · Slug: <code className="text-purple-300 font-mono">?tenant={t.id}</code>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(t)}
                              type="button"
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Edit Google Review Link & Config / Manager Login"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTenant(t.id)}
                              type="button"
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                              title="Delete Tenant"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Tenant Details */}
                        <div className="space-y-2.5 my-3 text-xs">
                          {/* Google Review Direct Target */}
                          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                              Google Review Destination URL (4-5 Stars)
                            </span>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-300 font-mono text-2xs truncate select-all">
                                {t.googleReviewUrl}
                              </span>
                              <a
                                href={t.googleReviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 hover:text-purple-400 text-slate-400 cursor-pointer"
                                title="Open Google Review URL"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>

                          {/* Manager Credentials */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/60">
                              <span className="text-2xs text-slate-400 block">Manager Login Email</span>
                              <span className="font-semibold text-slate-200 truncate block">
                                {t.adminEmail || t.managerEmail}
                              </span>
                            </div>
                            <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/60">
                              <span className="text-2xs text-slate-400 block">Manager Phone</span>
                              <span className="font-semibold text-slate-200 truncate block">
                                {t.managerPhone || 'Not set'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer URL for QR Code */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                        <div className="truncate text-slate-400 text-2xs">
                          Customer Flow: <strong className="text-purple-300 font-mono">{reviewUrl}</strong>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleCopyReviewUrl(t.id)}
                            type="button"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-2xs font-medium cursor-pointer"
                            title="Copy customer review link"
                          >
                            {isCopied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                          </button>
                          <a
                            href={reviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-2xs font-medium cursor-pointer"
                          >
                            <span>Test</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MASTER FEEDBACK STREAM */}
        {/* ========================================================================= */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-white">
                  Customer Negative Feedback Stream (1-3 Stars)
                </h3>
                {/* Tenant Filter Selector */}
                <select
                  value={selectedTenantFilter}
                  onChange={(e) => setSelectedTenantFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-purple-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="all">All Clients / Tenants ({feedbacks.length})</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.businessName} ({feedbacks.filter((f) => f.tenantId === t.id).length})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {filteredFeedbacks.length > 0 && (
                  <>
                    <button
                      onClick={handleExportCSV}
                      type="button"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={handleClearInbox}
                      type="button"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Records</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {filteredFeedbacks.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-medium text-slate-200">No negative feedback recorded</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When customers rate 1, 2, or 3 stars on any tenant, they are caught here privately and excluded from Google.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeedbacks.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ★ {item.rating} Stars
                        </span>
                        <span className="px-2 py-0.5 rounded-md font-semibold text-2xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {item.businessName || item.tenantId}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          {item.customerName || 'Anonymous'}
                        </span>
                        <span className="text-2xs text-slate-500 font-mono">
                          #{item.ticketId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-2xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {item.issues && item.issues.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {item.issues.map((issue, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full text-2xs bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.feedbackText && (
                      <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-2 italic">
                        "{item.feedbackText}"
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between text-2xs text-slate-400 pt-2 border-t border-slate-800/80 gap-2">
                      <div className="flex items-center gap-3">
                        {item.customerContact && item.customerContact !== 'Not provided' && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{item.customerContact}</span>
                          </span>
                        )}
                        <span>Follow-up: {item.wantFollowUp ? 'Customer wants response' : 'No response requested'}</span>
                      </div>
                      <span className="text-amber-400 font-medium">
                        {item.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PRODUCT OWNER SECURITY CREDENTIALS */}
        {/* ========================================================================= */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-google font-bold text-base text-white">
                    Product Owner Master Credentials
                  </h3>
                  <p className="text-xs text-slate-400">
                    Update your master login email and password in the database
                  </p>
                </div>
              </div>

              {credError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{credError}</span>
                </div>
              )}

              {credSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{credSuccess}</span>
                </div>
              )}

              <form onSubmit={handleUpdateOwnerCreds} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Master Login Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Current Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      placeholder="Enter current password to authorize changes"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      New Password (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        placeholder="Leave blank to keep"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSavingCreds}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-purple-600/30 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSavingCreds ? (
                      <span>Saving to Database...</span>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Update Product Owner Credentials</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW CLIENT / TENANT */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl animate-scaleUp my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-google font-bold text-base text-white">Add New Client Business</h3>
                  <p className="text-2xs text-slate-400">Configure new tenant Google Review link & store manager</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                type="button"
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addTenantError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addTenantError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Green Garden Bistro"
                    value={newTenantForm.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    URL Slug <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. green-garden"
                    value={newTenantForm.slug}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Google Review Direct Write URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  value={newTenantForm.googleReviewUrl}
                  onChange={(e) => setNewTenantForm({ ...newTenantForm, googleReviewUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-2xs text-slate-500 mt-1">
                  Customers rating 4 or 5 stars will be directly redirected to this authentic Google Review link.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Business Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Café & Bakery"
                    value={newTenantForm.category}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Physical Address / Tagline</label>
                  <input
                    type="text"
                    placeholder="e.g. 42 Indiranagar, Bengaluru"
                    value={newTenantForm.address}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Upload Cover Photo (No URL needed) */}
              <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/80">
                <ImageUploadField
                  label="Cover Photo / Store Banner"
                  value={newTenantForm.coverPhoto}
                  onChange={(val) => setNewTenantForm({ ...newTenantForm, coverPhoto: val })}
                  placeholder="Upload Store Cover Photo"
                  isBanner={true}
                  namePrefix="cover"
                />
              </div>

              {/* Dedicated Manager Credentials for this tenant */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <span className="text-2xs font-semibold uppercase tracking-wider text-purple-400 block">
                  Store Manager Portal Credentials (/login)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Manager Login Email</label>
                    <input
                      type="email"
                      required
                      placeholder="manager@greengarden.com"
                      value={newTenantForm.managerEmail}
                      onChange={(e) => setNewTenantForm({ ...newTenantForm, managerEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Initial Password</label>
                    <input
                      type="text"
                      required
                      placeholder="password123"
                      value={newTenantForm.managerPassword}
                      onChange={(e) => setNewTenantForm({ ...newTenantForm, managerPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  {isSubmittingAdd ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT TENANT (Google Review Link & Config + Manager Credentials) */}
      {/* ========================================================================= */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl animate-scaleUp my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-google font-bold text-base text-white">
                    Edit {editingTenant.businessName}
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Update Google Review Link, business branding & manager credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                type="button"
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editErrorNotice && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editErrorNotice}</span>
              </div>
            )}

            {editSuccessNotice && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{editSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Business Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Google Review Direct Write URL
                </label>
                <input
                  type="url"
                  required
                  value={editForm.googleReviewUrl}
                  onChange={(e) => setEditForm({ ...editForm, googleReviewUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Physical Address / Tagline</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Upload Cover Photo (No URL needed) */}
              <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/80">
                <ImageUploadField
                  label="Cover Photo / Store Banner"
                  value={editForm.coverPhoto}
                  onChange={(val) => setEditForm({ ...editForm, coverPhoto: val })}
                  placeholder="Upload Store Cover Photo"
                  isBanner={true}
                  namePrefix="cover"
                />
              </div>

              {/* Dedicated Manager Credentials */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <span className="text-2xs font-semibold uppercase tracking-wider text-purple-400 block">
                  Store Manager Portal Credentials (/login)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Manager Login Email</label>
                    <input
                      type="email"
                      value={editForm.managerEmail}
                      onChange={(e) => setEditForm({ ...editForm, managerEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Reset Password (Leave blank to keep)
                    </label>
                    <input
                      type="text"
                      placeholder="••••••••••••"
                      value={editForm.managerPassword}
                      onChange={(e) => setEditForm({ ...editForm, managerPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

