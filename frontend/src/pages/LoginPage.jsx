import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const roleConfig = {
  admin: {
    title: 'Admin Login',
    roleLabel: 'Administrator',
    route: '/admin-login',
    description: 'Full control center — analytics, staff management and system oversight.',
    headline: 'Command Your Entire Clinic',
    features: [
      'Real-time analytics & revenue insights',
      'Doctor & receptionist management',
      'Complete patient registry access',
    ],
    button: 'bg-violet-600 hover:bg-violet-700 hover:shadow-violet-600/40',
    gradientBar: 'from-violet-600 to-indigo-500',
    accentText: 'text-violet-600',
    accentBorder: 'focus:border-violet-600 focus:ring-violet-600/25',
    accentBg: 'bg-violet-600',
    accentIcon: 'text-violet-400',
    chip: 'bg-violet-50 text-violet-700 border-violet-300 hover:border-violet-600',
    panelGlow: 'bg-violet-500/20',
    bullet: 'bg-violet-500',
    iconPath: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  },
  doctor: {
    title: 'Doctor Login',
    roleLabel: 'Doctor',
    route: '/doctor-login',
    description: 'Your consultation workspace — patients, records and follow-ups.',
    headline: 'Care for Your Patients',
    features: [
      'Live patient queue & new enquiries',
      'Digital diagnosis & prescriptions',
      'Follow-up scheduling & reminders',
    ],
    button: 'bg-sky-600 hover:bg-sky-700 hover:shadow-sky-600/40',
    gradientBar: 'from-sky-600 to-cyan-500',
    accentText: 'text-sky-600',
    accentBorder: 'focus:border-sky-600 focus:ring-sky-600/25',
    accentBg: 'bg-sky-600',
    accentIcon: 'text-sky-400',
    chip: 'bg-sky-50 text-sky-700 border-sky-300 hover:border-sky-600',
    panelGlow: 'bg-sky-500/20',
    bullet: 'bg-sky-500',
    iconPath: (<><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></>),
  },
  receptionist: {
    title: 'Receptionist Login',
    roleLabel: 'Receptionist',
    route: '/receptionist-login',
    description: 'Front desk command — registration, scheduling and enquiries.',
    headline: 'Welcome Every Patient',
    features: [
      'Smart patient & family lookup',
      'Appointment scheduling board',
      'One-tap WhatsApp confirmations',
    ],
    button: 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/40',
    gradientBar: 'from-emerald-600 to-teal-500',
    accentText: 'text-emerald-600',
    accentBorder: 'focus:border-emerald-600 focus:ring-emerald-600/25',
    accentBg: 'bg-emerald-600',
    accentIcon: 'text-emerald-400',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:border-emerald-600',
    panelGlow: 'bg-emerald-500/20',
    bullet: 'bg-emerald-500',
    iconPath: (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" /><line x1="16" y1="11" x2="8" y2="11" /><line x1="16" y1="15" x2="12" y2="15" /></>),
  },
};

function validateEmail(email) {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return '';
}

function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
}

export default function LoginPage({ role }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const config = roleConfig[role];
  const otherRoles = Object.entries(roleConfig).filter(([key]) => key !== role);

  const validate = () => {
    const errors = {};
    errors.email = validateEmail(email);
    errors.password = validatePassword(password);
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errors = {};
    if (field === 'email') errors.email = validateEmail(email);
    if (field === 'password') errors.password = validatePassword(password);
    setFieldErrors((prev) => ({ ...prev, ...errors }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({ email: true, password: true });

    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password, role);
      navigate(`/${role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase = 'appearance-none block w-full pl-11 py-3 border-2 bg-slate-50 focus:bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-all';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        body { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
        .font-display { font-family: 'Sora', sans-serif; }
        .login-grid { background-image: linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px); background-size: 36px 36px; }
        .login-grid-teal { background-image: linear-gradient(rgba(45,212,191,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.18) 1px, transparent 1px); background-size: 36px 36px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.7s ease-out both; }
        .animate-slide-up-delay { animation: slideUp 0.7s ease-out 0.15s both; }
      `}</style>

      {/* ══════════════ Left Brand Panel ══════════════ */}
      <aside className="relative overflow-hidden bg-slate-950 lg:w-[46%] flex flex-col lg:min-h-screen">
        {/* Background layers */}
        <div className="absolute inset-0 login-grid pointer-events-none" />
        <div className={`absolute -top-32 -right-24 w-96 h-96 ${config.panelGlow} blur-3xl rounded-full pointer-events-none`} />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-56 h-56 border-t-2 border-r-2 border-teal-500/20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 border-b-2 border-l-2 border-teal-500/20 pointer-events-none" />

        <div className="relative flex-1 flex flex-col justify-between px-6 sm:px-10 lg:px-12 py-10 lg:py-12">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/30 group-hover:bg-teal-500 transition-colors">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="leading-none">
                <p className="font-display font-bold text-white text-lg">HealthCare <span className="text-teal-400">Clinic</span></p>
                <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-bold mt-1">Staff Portal Access</p>
              </div>
            </Link>
            <Link
              to="/"
              className="hidden lg:inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-teal-400 border border-white/10 hover:border-teal-500/50 px-4 py-2.5 transition-colors"
            >
              ← Back to Website
            </Link>
          </div>

          {/* Hero content */}
          <div className="mt-10 lg:mt-0 max-w-md">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-[2px] bg-teal-500" />
              <span className="text-teal-400 text-[10px] font-bold uppercase tracking-[0.35em]">{config.roleLabel} Portal</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] tracking-tight">
              {config.headline}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-5 leading-relaxed">
              {config.description}
            </p>

            <ul className="mt-8 space-y-3.5">
              {config.features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <span className={`w-6 h-6 ${config.bullet} text-white flex items-center justify-center shrink-0`}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="text-slate-300 text-sm font-medium">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom strip */}
          <div className="mt-10 lg:mt-0 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full bg-teal-400 opacity-75 rounded-full" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                System <span className="text-teal-400">Online</span>
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-3.5 h-3.5 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <rect x="3" y="11" width="18" height="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Secure Encrypted Access</p>
            </div>
            <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-[0.2em] sm:ml-auto">© 2026 HealthCare Clinic</p>
          </div>
        </div>
      </aside>

      {/* ══════════════ Right Form Panel ══════════════ */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 lg:py-12 relative overflow-hidden">
        {/* subtle grid bg */}
        <div className="absolute inset-0 login-grid-teal opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md animate-slide-up">
          {/* Mobile-only header (panel is condensed above) */}
          <div className="lg:hidden text-center mb-6">
            <div className={`inline-flex items-center gap-2 border px-4 py-2 mb-4 ${config.chip}`}>
              <svg className={`w-4 h-4 ${config.accentText}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                {config.iconPath}
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em]">{config.roleLabel} Portal</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-2xl shadow-slate-900/10">
            {/* Top accent bar */}
            <div className={`h-1.5 bg-gradient-to-r ${config.gradientBar}`} />

            <div className="px-6 sm:px-9 py-8 sm:py-10">
              {/* Header */}
              <div className="mb-8">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {config.title}
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  Sign in with your credentials to continue to your dashboard.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-600 text-red-800 px-4 py-3.5 flex items-center gap-3">
                    <div className="w-7 h-7 bg-red-600 text-white flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold flex-1">{error}</span>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-4.5 w-4.5 h-[18px] w-[18px] text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (touched.email) {
                          setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                        }
                      }}
                      onBlur={() => handleBlur('email')}
                      className={`${inputBase} ${
                        touched.email && fieldErrors.email
                          ? 'border-red-400 bg-red-50/40 focus:border-red-600 focus:ring-red-600/25'
                          : `border-slate-200 hover:border-slate-300 ${config.accentBorder}`
                      }`}
                      placeholder="you@example.com"
                    />
                  </div>
                  {touched.email && fieldErrors.email && (
                    <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-[18px] w-[18px] text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                        <rect x="3" y="11" width="18" height="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (touched.password) {
                          setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                        }
                      }}
                      onBlur={() => handleBlur('password')}
                      className={`${inputBase} pr-12 ${
                        touched.password && fieldErrors.password
                          ? 'border-red-400 bg-red-50/40 focus:border-red-600 focus:ring-red-600/25'
                          : `border-slate-200 hover:border-slate-300 ${config.accentBorder}`
                      }`}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {touched.password && fieldErrors.password && (
                    <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Remember / Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 border-2 border-slate-300 accent-teal-600 focus:ring-teal-600/30" />
                    <span className="ml-2.5 text-xs text-slate-600 font-semibold group-hover:text-slate-900 transition-colors">Remember me</span>
                  </label>
                  <a href="#" className={`text-xs font-bold uppercase tracking-wider ${config.accentText} hover:underline underline-offset-2`}>
                    Forgot password?
                  </a>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 text-white text-xs font-bold uppercase tracking-[0.2em] shadow-lg ${config.button} disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0`}
                >
                  {loading && <Spinner />}
                  <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                  {!loading && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 mt-8">
                <span className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Other Portals</span>
                <span className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Role switcher */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                {otherRoles.map(([key, cfg]) => (
                  <Link
                    key={key}
                    to={cfg.route}
                    className="flex items-center gap-2.5 px-4 py-3 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 hover:bg-slate-900 hover:text-white transition-all group"
                  >
                    <svg className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-teal-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                      {cfg.iconPath}
                    </svg>
                    <span className="truncate">{cfg.roleLabel}</span>
                  </Link>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                  <rect x="3" y="11" width="18" height="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="font-semibold uppercase tracking-wider">Protected · Authorized staff only</span>
              </div>
            </div>
          </div>

          {/* Mobile back link */}
          <div className="lg:hidden text-center mt-6">
            <Link to="/" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-teal-600 transition-colors">
              ← Back to Website
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}