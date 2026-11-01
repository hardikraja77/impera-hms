import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import Spinner from './Spinner';
import { useEchoStatus } from '../hooks/useEcho';
import { STATUS_META } from './statusMeta';

const roleLabels = {
  admin: 'Administrator',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
};

// Dark-theme classes for the sidebar's status strip (semantic color → tailwind)
const SIDEBAR_DOT = {
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
  slate: 'bg-slate-500',
};

const SIDEBAR_TEXT = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  slate: 'text-slate-500',
};

export default function Sidebar({ navItems, title }) {
  const { user, logout } = useAuth();
  const wsStatus = useEchoStatus();
  const wsMeta = STATUS_META[wsStatus] || STATUS_META.idle;
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [navItems]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordError('');
    setPasswordSuccess('');

    const errs = {};
    if (!passwordForm.current_password) errs.current_password = 'Current password is required';
    if (!passwordForm.new_password) errs.new_password = 'New password is required';
    else if (passwordForm.new_password.length < 6) errs.new_password = 'Must be at least 6 characters';
    if (passwordForm.new_password !== passwordForm.new_password_confirmation)
      errs.new_password_confirmation = 'Passwords do not match';
    setPasswordErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPasswordLoading(true);
    try {
      await api.post('/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        new_password_confirmation: passwordForm.new_password_confirmation,
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowChangePassword(false);
    setPasswordErrors({});
    setPasswordError('');
    setPasswordSuccess('');
    setShowPasswords({ current: false, new: false, confirm: false });
  };

  return (
    <>
      <style>{`
        .font-display { font-family: 'Sora', 'Plus Jakarta Sans', sans-serif; }
        .dash-grid { background-image: linear-gradient(rgba(45,212,191,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.14) 1px, transparent 1px); background-size: 32px 32px; }
      `}</style>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-11 h-11 bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30 hover:bg-teal-500 transition-colors"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-slate-950 text-white flex flex-col z-50 transform transition-transform duration-300 ease-out border-r border-white/5 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Header */}
        <div className="relative p-5 border-b border-white/5 overflow-hidden shrink-0">
          <div className="absolute inset-0 dash-grid opacity-60 pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-teal-500/15 blur-2xl rounded-full pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/30">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="leading-none">
                <h2 className="font-display text-sm font-bold tracking-tight">
                  HealthCare <span className="text-teal-400">Clinic</span>
                </h2>
                <p className="text-[9px] text-slate-500 uppercase tracking-[0.25em] font-bold mt-1.5">
                  {roleLabels[user?.role] || 'Staff'} Portal
                </p>
              </div>
            </div>
            {/* Mobile Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
              aria-label="Close menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-5 overflow-y-auto">
          {(title || true) && (
            <div className="px-6 mb-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] font-bold flex items-center gap-2">
                <span className="w-4 h-[2px] bg-teal-600" />
                {title || 'Menu'}
              </p>
            </div>
          )}
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.onClick()}
              className={`group relative w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition-all duration-200 ${
                item.active
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {/* Active indicator bar */}
              {item.active && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-teal-300" />
              )}
              <span className={`text-base shrink-0 ${item.active ? '' : 'opacity-80 group-hover:opacity-100 group-hover:text-teal-400'} transition-colors`}>
                {item.icon}
              </span>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 min-w-[22px] text-center shrink-0 ${
                  item.active
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-400 text-slate-900'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Live WebSocket status strip */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center gap-2.5 shrink-0">
          <span className="relative flex h-2 w-2 shrink-0">
            {wsMeta.color !== 'slate' && (
              <span className={`animate-ping absolute inline-flex h-full w-full ${SIDEBAR_DOT[wsMeta.color]} opacity-75 rounded-full`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${SIDEBAR_DOT[wsMeta.color]}`} />
          </span>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">
            System <span className={SIDEBAR_TEXT[wsMeta.color]}>{wsMeta.label}</span>
          </p>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-white/5 bg-black/30 shrink-0">
          <div className="flex items-center gap-3 mb-3 px-3 py-2.5 bg-white/5 border border-white/5">
            <div className="w-9 h-9 bg-teal-600 flex items-center justify-center font-display font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-teal-400 hover:bg-white/5 transition-colors group"
            >
              <svg className="w-4 h-4 shrink-0 group-hover:text-teal-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <rect x="3" y="11" width="18" height="11" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Change Password</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors group"
            >
              <svg className="w-4 h-4 shrink-0 group-hover:text-red-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-4">
          <div className="bg-white w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border-t-4 border-t-teal-600">
            {/* Modal header */}
            <div className="bg-slate-900 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 dash-grid opacity-25 pointer-events-none" />
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-teal-500/20 blur-2xl rounded-full pointer-events-none" />
              <div className="relative px-5 sm:px-6 py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                      <rect x="3" y="11" width="18" height="11" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-400">Account Security</p>
                    <h3 className="font-display text-lg font-bold text-white">Change Password</h3>
                  </div>
                </div>
                <button
                  onClick={closePasswordModal}
                  className="w-9 h-9 border border-white/20 text-slate-300 hover:text-white hover:border-teal-500 flex items-center justify-center shrink-0 transition-colors"
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto p-5 sm:p-6">
              {passwordSuccess && (
                <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-800 px-4 py-3 text-sm font-semibold mb-5 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="bg-red-50 border-l-4 border-red-600 text-red-800 px-4 py-3 text-sm font-semibold mb-5 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} id="change-password-form" className="space-y-5">
                {[
                  { key: 'current_password', label: 'Current Password', placeholder: 'Enter current password', showKey: 'current' },
                  { key: 'new_password', label: 'New Password', placeholder: 'Minimum 6 characters', showKey: 'new' },
                  { key: 'new_password_confirmation', label: 'Confirm Password', placeholder: 'Re-enter new password', showKey: 'confirm' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5">
                      {field.label} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords[field.showKey] ? 'text' : 'password'}
                        value={passwordForm[field.key]}
                        onChange={(e) => setPasswordForm({ ...passwordForm, [field.key]: e.target.value })}
                        className={`w-full px-4 py-2.5 pr-11 bg-white border text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-all ${
                          passwordErrors[field.key]
                            ? 'border-red-400 bg-red-50/40 focus:ring-red-600/30 focus:border-red-600'
                            : 'border-slate-300 hover:border-slate-400 focus:ring-teal-600/30 focus:border-teal-600'
                        }`}
                        placeholder={field.placeholder}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, [field.showKey]: !showPasswords[field.showKey] })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                        aria-label={showPasswords[field.showKey] ? 'Hide password' : 'Show password'}
                      >
                        {showPasswords[field.showKey] ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordErrors[field.key] && (
                      <p className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{passwordErrors[field.key]}</span>
                      </p>
                    )}
                  </div>
                ))}
              </form>
            </div>

            {/* Modal footer */}
            <div className="border-t border-slate-200 px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 bg-white">
              <button
                type="button"
                onClick={closePasswordModal}
                className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="change-password-form"
                disabled={passwordLoading}
                className="px-6 py-3 bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all"
              >
                {passwordLoading && <Spinner />}
                <span>{passwordLoading ? 'Changing...' : 'Update Password'}</span>
                {!passwordLoading && (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}