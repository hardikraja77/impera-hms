import { useState, useEffect, useCallback, useRef } from 'react';
import api, { getErrorMessage, generateWhatsAppLink } from '../../api';
import Sidebar from '../../components/Sidebar';
import Spinner from '../../components/Spinner';
import ConnectionStatus from '../../components/ConnectionStatus';
import { useEchoChannel } from '../../hooks/useEcho';

/* --------------------------------- Icons ---------------------------------- */

const ICONS = {
  chart: (<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>),
  user: (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  users: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  briefcase: (<><rect x="2" y="7" width="20" height="14" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>),
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  plus: (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  edit: (<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>),
  trash: (<><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
  x: (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  search: (<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>),
  refresh: (<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>),
  message: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  mail: (<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>),
  clock: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  alert: (<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
  check: <polyline points="20 6 9 17 4 12" />,
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  award: (<><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></>),
  'trending-up': (<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>),
  pie: (<><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>),
  dollar: (<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>),
  inbox: (<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>),
  clipboard: (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" /></>),
};

function Icon({ name, className = 'w-5 h-5', strokeWidth = 2 }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

const initials = (name) => (name || '?').charAt(0).toUpperCase();

/* ------------------------------ Status system ------------------------------ */

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-amber-50 text-amber-700 border-amber-300',     dot: 'bg-amber-500' },
  enquired:  { label: 'Enquired',  color: 'bg-sky-50 text-sky-700 border-sky-300',           dot: 'bg-sky-500' },
  assigned:  { label: 'Assigned',  color: 'bg-indigo-50 text-indigo-700 border-indigo-300',  dot: 'bg-indigo-500' },
  consulted: { label: 'Consulted', color: 'bg-orange-50 text-orange-700 border-orange-300',  dot: 'bg-orange-500' },
  completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
};

const STATUS_HEX = {
  pending: '#f59e0b',
  enquired: '#0ea5e9',
  assigned: '#6366f1',
  consulted: '#f97316',
  completed: '#10b981',
};

/* ---------------------- Analytics live-update helpers ---------------------- */

const todayStr = () => new Date().toISOString().split('T')[0];

// Increment/decrement one status in the consultation status-distribution array
function bumpDistribution(dist, status, delta) {
  const idx = dist.findIndex((d) => d.status === status);
  const next = idx === -1
    ? [...dist, { status, count: Math.max(0, delta) }]
    : dist.map((d, i) => (i === idx ? { ...d, count: d.count + delta } : d));
  return next.filter((d) => d.count > 0);
}

// Increment/decrement today's entry in the daily-stats array (matches backend { date, total })
function bumpDailyStats(daily, date, delta) {
  const idx = daily.findIndex((d) => d.date === date);
  const next = idx === -1
    ? [...daily, { date, total: Math.max(0, delta) }]
    : daily.map((d, i) => (i === idx ? { ...d, total: d.total + delta } : d));
  return next.filter((d) => d.total > 0);
}

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap ${config.color}`}>
      <span className={`w-1.5 h-1.5 ${config.dot}`} />
      {config.label}
    </span>
  );
};

/* ------------------------------- Accent map -------------------------------- */

const ACCENTS = {
  teal:    { edge: 'border-l-teal-500',    icon: 'bg-teal-50 border-teal-300 text-teal-600',       text: 'text-teal-600' },
  sky:     { edge: 'border-l-sky-500',     icon: 'bg-sky-50 border-sky-300 text-sky-600',          text: 'text-sky-600' },
  emerald: { edge: 'border-l-emerald-500', icon: 'bg-emerald-50 border-emerald-300 text-emerald-600', text: 'text-emerald-600' },
  violet:  { edge: 'border-l-violet-500',  icon: 'bg-violet-50 border-violet-300 text-violet-600', text: 'text-violet-600' },
  amber:   { edge: 'border-l-amber-500',   icon: 'bg-amber-50 border-amber-300 text-amber-600',    text: 'text-amber-600' },
  orange:  { edge: 'border-l-orange-500',  icon: 'bg-orange-50 border-orange-300 text-orange-600', text: 'text-orange-600' },
  slate:   { edge: 'border-l-slate-500',   icon: 'bg-slate-100 border-slate-300 text-slate-600',   text: 'text-slate-700' },
};

/* ------------------------------ Stat & charts ------------------------------ */

function StatCard({ title, value, icon, color = 'teal', sub }) {
  const a = ACCENTS[color] || ACCENTS.teal;
  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${a.edge} shadow-sm p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className={`font-display text-2xl xl:text-3xl font-bold mt-2 truncate ${a.text}`}>{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{sub}</p>}
        </div>
        <div className={`w-11 h-11 border flex items-center justify-center shrink-0 ${a.icon}`}>
          <Icon name={icon} className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function RevenueHeroCard({ value, label, icon }) {
  return (
    <div className="relative overflow-hidden bg-slate-900 border border-slate-900 shadow-sm p-6">
      <div className="absolute inset-0 dash-grid opacity-20 pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-teal-500/20 blur-3xl rounded-full pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p>
          <p className="font-display text-3xl xl:text-4xl font-bold text-teal-400 mt-2">{value}</p>
          <p className="text-[11px] text-slate-500 mt-2 font-semibold uppercase tracking-widest">Selected date range</p>
        </div>
        <div className="w-12 h-12 bg-teal-600 text-white flex items-center justify-center shrink-0">
          <Icon name={icon} className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function DonutChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const r = 60;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = total > 0 ? d.count / total : 0;
    const seg = { ...d, fraction, offset: cumulative };
    cumulative += fraction;
    return seg;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
          {segments.map((seg) => (
            <circle
              key={seg.status}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={STATUS_HEX[seg.status] || '#94a3b8'}
              strokeWidth="16"
              strokeDasharray={`${seg.fraction * circumference} ${circumference}`}
              strokeDashoffset={-seg.offset * circumference}
              className="transition-all duration-700"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-slate-900">{total}</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400">Total</span>
        </div>
      </div>
      <div className="space-y-3 flex-1 w-full">
        {segments.map((seg) => (
          <div key={seg.status} className="flex items-center gap-3">
            <span className="w-3 h-3 shrink-0" style={{ backgroundColor: STATUS_HEX[seg.status] || '#94a3b8' }} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600 capitalize flex-1">{seg.status}</span>
            <span className="text-xs text-slate-500 font-semibold">{seg.count}</span>
            <span className="text-xs font-display font-bold text-slate-900 w-12 text-right">{(seg.fraction * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Shared pieces ------------------------------ */

const EmptyState = ({ icon, message, subtitle }) => (
  <div className="bg-white border border-slate-200 shadow-sm px-6 py-16 text-center">
    <div className="w-16 h-16 mx-auto border-2 border-slate-200 text-slate-300 flex items-center justify-center">
      <Icon name={icon} className="w-8 h-8" />
    </div>
    <p className="font-display font-bold text-slate-700 text-lg mt-5">{message}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wider">{subtitle}</p>}
  </div>
);

const FieldSelect = ({ className = '', children, ...props }) => (
  <div className="relative">
    <select {...props} className={`${className} appearance-none pr-10 cursor-pointer`}>
      {children}
    </select>
    <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

const ChartCard = ({ label, title, children }) => (
  <div className="bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
    <div className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-600 flex items-center gap-2">
        <span className="w-5 h-[2px] bg-teal-600" /> {label}
      </p>
      <h3 className="font-display font-bold text-slate-900 text-lg mt-2">{title}</h3>
    </div>
    {children}
  </div>
);

/* -------------------------------- Component -------------------------------- */

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [nextAppointments, setNextAppointments] = useState([]);
  const [nextApptDate, setNextApptDate] = useState('');
  const [nextApptDoctor, setNextApptDoctor] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [error, setError] = useState('');

  // Analytics filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [analyticsDoctor, setAnalyticsDoctor] = useState('');
  const [analyticsDept, setAnalyticsDept] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [modalErrors, setModalErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ── All fetch functions declared BEFORE hooks that reference them ──

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await api.get('/admin/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error('[Admin] Doctors fetch failed:', getErrorMessage(err));
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('from_date', fromDate);
      params.append('to_date', toDate);
      if (analyticsDoctor) params.append('doctor_id', analyticsDoctor);
      if (analyticsDept) params.append('department', analyticsDept);
      const res = await api.get(`/admin/analytics?${params.toString()}`);
      setAnalytics(res.data);
    } catch (err) {
      console.error('[Admin] Analytics fetch failed:', getErrorMessage(err));
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, analyticsDoctor, analyticsDept]);

  const fetchReceptionists = useCallback(async () => {
    try {
      const res = await api.get('/admin/receptionists');
      setReceptionists(res.data);
    } catch (err) {
      console.error('[Admin] Receptionists fetch failed:', getErrorMessage(err));
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      if (filterDoctor) params.append('doctor_id', filterDoctor);
      if (filterDate) params.append('date', filterDate);
      const res = await api.get(`/admin/patients?${params.toString()}`);
      setPatients(res.data.data || []);
    } catch (err) {
      console.error('[Admin] Patients fetch failed:', getErrorMessage(err));
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterDoctor, filterDate]);

  const fetchNextAppointments = useCallback(async () => {
    setLoadingNext(true);
    try {
      const params = new URLSearchParams();
      if (nextApptDate) params.append('date', nextApptDate);
      if (nextApptDoctor) params.append('doctor_id', nextApptDoctor);
      const res = await api.get(`/admin/next-appointments?${params.toString()}`);
      setNextAppointments(res.data || []);
    } catch (err) {
      console.error('[Admin] Next appointments fetch failed:', getErrorMessage(err));
      setError(getErrorMessage(err));
    } finally {
      setLoadingNext(false);
    }
  }, [nextApptDate, nextApptDoctor]);

  // Mirrors the active date range so Echo handlers can guard range-sensitive stats
  const rangeRef = useRef({ fromDate, toDate });
  useEffect(() => {
    rangeRef.current = { fromDate, toDate };
  }, [fromDate, toDate]);

  // ── Effects ──

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'doctors') fetchDoctors();
    if (activeTab === 'receptionists') fetchReceptionists();
    if (activeTab === 'patients') fetchPatients();
    if (activeTab === 'nextAppointments') fetchNextAppointments();
  }, [activeTab, fetchAnalytics, fetchDoctors, fetchReceptionists, fetchPatients, fetchNextAppointments]);

  useEffect(() => {
    if (activeTab === 'patients') fetchPatients();
  }, [search, filterStatus, filterDoctor, filterDate, fetchPatients, activeTab]);

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
  }, [fromDate, toDate, analyticsDoctor, analyticsDept, fetchAnalytics, activeTab]);

  useEffect(() => {
    if (activeTab === 'nextAppointments') fetchNextAppointments();
  }, [nextApptDate, nextApptDoctor, activeTab, fetchNextAppointments]);

  // ── Real-time Echo subscriptions (stat cards update directly from event payloads) ──
  useEchoChannel(
    'admin.dashboard',
    '.patient.created',
    useCallback((e) => {
      const p = e.patient;
      const today = todayStr();
      const { fromDate, toDate } = rangeRef.current || {};
      const inRange = (!fromDate || today >= fromDate) && (!toDate || today <= toDate);

      setAnalytics((prev) => {
        if (!prev) return prev;
        const next = { ...prev, today_patients: (prev.today_patients || 0) + 1 };
        if (e.is_new) {
          // Only brand-new registrations add to all-time / assigned counts
          next.total_patients = (prev.total_patients || 0) + 1;
          if (p.status === 'assigned') next.assigned_patients = (prev.assigned_patients || 0) + 1;
        }
        if (inRange) {
          // Every registration creates a pending consultation today
          next.range_patients = (prev.range_patients || 0) + 1;
          next.status_distribution = bumpDistribution(prev.status_distribution || [], 'pending', 1);
          next.daily_stats = bumpDailyStats(prev.daily_stats || [], today, 1);
        }
        return next;
      });

      if (activeTab === 'patients') fetchPatients();
    }, [activeTab, fetchPatients])
  );

  useEchoChannel(
    'admin.dashboard',
    '.patient.status.updated',
    useCallback((e) => {
      const { old_status: oldS, status: newS } = e.patient;
      const bucketOf = (s) =>
        s === 'assigned' ? 'assigned_patients'
        : s === 'consulted' ? 'consulted_patients'
        : s === 'completed' ? 'completed_patients'
        : null;
      const oldKey = bucketOf(oldS);
      const newKey = bucketOf(newS);

      // Shift the patient between the assigned/consulted/completed stat buckets
      setAnalytics((prev) => {
        if (!prev || !oldKey && !newKey || oldKey === newKey) return prev;
        const next = { ...prev };
        if (oldKey) next[oldKey] = Math.max(0, (prev[oldKey] || 0) - 1);
        if (newKey) next[newKey] = (prev[newKey] || 0) + 1;
        return next;
      });

      if (activeTab === 'patients') fetchPatients();
    }, [activeTab, fetchPatients])
  );

  useEchoChannel(
    'admin.dashboard',
    '.consultation.updated',
    useCallback((e) => {
      const c = e.consultation;
      const fee = Number(c.consultation_fee || 0);
      const today = todayStr();
      const { fromDate, toDate } = rangeRef.current || {};
      const inRange = (!fromDate || today >= fromDate) && (!toDate || today <= toDate);

      // Patient bucket moves are handled by .patient.status.updated — only touch
      // consultation-level stats and revenue here to avoid double-counting.
      setAnalytics((prev) => {
        if (!prev) return prev;
        const next = { ...prev };

        if (c.action === 'started') {
          // consultation moved pending → in_progress
          if (inRange) {
            next.status_distribution = bumpDistribution(prev.status_distribution || [], 'pending', -1);
            next.status_distribution = bumpDistribution(next.status_distribution, 'in_progress', 1);
          }
          return next;
        }

        if (c.action === 'completed') {
          if (inRange) {
            next.status_distribution = bumpDistribution(prev.status_distribution || [], 'in_progress', -1);
            next.status_distribution = bumpDistribution(next.status_distribution, 'completed', 1);
          }
          if (fee > 0) {
            next.today_revenue = (prev.today_revenue || 0) + fee;
            next.monthly_revenue = (prev.monthly_revenue || 0) + fee;
            if (inRange) next.total_revenue = (prev.total_revenue || 0) + fee;
          }
          return next;
        }

        return next; // 'updated' — details only, no counts shift
      });

      if (activeTab === 'patients') fetchPatients();
      if (activeTab === 'nextAppointments') fetchNextAppointments();
    }, [activeTab, fetchPatients, fetchNextAppointments])
  );

  useEchoChannel(
    'admin.dashboard',
    '.doctor.availability.changed',
    useCallback((e) => {
      setDoctors((prev) =>
        prev.map((d) => (d.id === e.doctor.id ? { ...d, availability: e.doctor.status } : d))
      );
    }, [])
  );

  // ── Modal & CRUD handlers ──

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditItem(item);
    if (type === 'doctor') {
      setFormData(item ? {
        name: item.user?.name || '',
        email: item.user?.email || '',
        phone: item.phone || '',
        specialization: item.specialization || '',
        consultation_fee: item.consultation_fee || 0,
        available_days: item.available_days || [],
        available_from: item.available_from || '09:00',
        available_to: item.available_to || '17:00',
      } : {
        name: '', email: '', phone: '', password: '', password_confirmation: '',
        specialization: '', consultation_fee: 0,
        available_days: ['Mon','Tue','Wed','Thu','Fri'],
        available_from: '09:00', available_to: '17:00',
      });
    } else if (type === 'receptionist') {
      setFormData(item ? {
        name: item.name || '', email: item.email || '', phone: item.phone || '',
      } : { name: '', email: '', phone: '', password: '', password_confirmation: '' });
    }
    setModalErrors({});
    setShowModal(true);
  };

  const validateModal = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = 'Name is required';
    if (!formData.email?.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email';
    if (modalType === 'doctor' && !formData.specialization?.trim()) errs.specialization = 'Specialization is required';
    if (!editItem) {
      if (!formData.password) errs.password = 'Password is required';
      else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.password_confirmation) errs.password_confirmation = 'Passwords do not match';
    }
    setModalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateModal()) return;
    setSaving(true);
    try {
      if (modalType === 'doctor') {
        if (editItem) {
          await api.put(`/admin/doctors/${editItem.id}`, formData);
        } else {
          await api.post('/admin/doctors', formData);
        }
        fetchDoctors();
      } else if (modalType === 'receptionist') {
        if (editItem) {
          await api.put(`/admin/receptionists/${editItem.id}`, formData);
        } else {
          await api.post('/admin/receptionists', formData);
        }
        fetchReceptionists();
      }
      setShowModal(false);
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        const mapped = {};
        for (const [key, val] of Object.entries(serverErrors)) {
          mapped[key] = Array.isArray(val) ? val[0] : val;
        }
        setModalErrors(mapped);
      } else {
        setModalErrors({ _general: getErrorMessage(err) });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    setDeletingId(id);
    try {
      if (type === 'doctor') {
        await api.delete(`/admin/doctors/${id}`);
        fetchDoctors();
      } else {
        await api.delete(`/admin/receptionists/${id}`);
        fetchReceptionists();
      }
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleWhatsAppEnquiry = (patient) => {
    const hospitalName = 'HealthCare';
    const doctorName = patient.doctor?.user?.name || 'Unassigned';
    const appointmentDate = new Date(patient.created_at).toLocaleDateString('en-IN');
    const appointmentTime = patient.consultation?.appointment_time
      ? new Date(patient.consultation.appointment_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : 'Not scheduled';

    const message = `Hello, this is regarding your appointment at ${hospitalName}.\n\nPatient: ${patient.name}\nDoctor: ${doctorName}\nScheduled Date: ${appointmentDate}\nTime: ${appointmentTime}\n\nPlease confirm your availability.`;

    const url = generateWhatsAppLink(patient.phone, message);
    window.open(url, '_blank');
  };

  // ── Navigation & display helpers ──

  const navItems = [
    { id: 'analytics', label: 'Analytics', icon: '📊', active: activeTab === 'analytics', onClick: () => setActiveTab('analytics') },
    { id: 'doctors', label: 'Doctors', icon: '👨‍⚕️', active: activeTab === 'doctors', onClick: () => setActiveTab('doctors'), badge: doctors.length },
    { id: 'receptionists', label: 'Receptionists', icon: '🧑‍💼', active: activeTab === 'receptionists', onClick: () => setActiveTab('receptionists'), badge: receptionists.length },
    { id: 'nextAppointments', label: 'Next Appointments', icon: '📅', active: activeTab === 'nextAppointments', onClick: () => setActiveTab('nextAppointments'), badge: nextAppointments.length },
    { id: 'patients', label: 'All Patients', icon: '👥', active: activeTab === 'patients', onClick: () => setActiveTab('patients') },
  ];

  const TABS = [
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
    { id: 'doctors', label: 'Doctors', icon: 'user', badge: doctors.length },
    { id: 'receptionists', label: 'Receptionists', icon: 'briefcase', badge: receptionists.length },
    { id: 'nextAppointments', label: 'Follow-ups', icon: 'calendar', badge: nextAppointments.length },
    { id: 'patients', label: 'All Patients', icon: 'users' },
  ];

  const headerMeta =
    activeTab === 'analytics'
      ? { title: 'Analytics Overview', subtitle: 'Real-time performance insights across patients, doctors and revenue. Filter by date range, doctor or department to drill down.' }
      : activeTab === 'doctors'
        ? { title: 'Doctor Management', subtitle: 'Create specialist accounts, set consultation fees and availability, and manage the entire medical team.' }
        : activeTab === 'receptionists'
          ? { title: 'Receptionist Management', subtitle: 'Onboard and manage front-desk staff accounts with full edit control.' }
          : activeTab === 'nextAppointments'
            ? { title: 'Follow-up Overview', subtitle: 'Doctor-assigned follow-up appointments across the clinic — filter by date or doctor.' }
            : { title: 'Patient Registry', subtitle: 'Every registered patient in one place. Search, filter and reach out instantly.' };

  // ── Derived insights (computed client-side from existing analytics data) ──
  const insights = [];
  if (analytics) {
    const days = analytics.daily_stats || [];
    if (days.length > 0 && analytics.range_patients) {
      insights.push({
        icon: 'trending-up',
        label: 'Avg Patients / Day',
        value: (analytics.range_patients / days.length).toFixed(1),
      });
      const busiest = days.reduce((a, b) => (b.total > a.total ? b : a), days[0]);
      insights.push({
        icon: 'zap',
        label: 'Busiest Day',
        value: new Date(busiest.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        sub: `${busiest.total} patients`,
      });
    }
    const dist = analytics.status_distribution || [];
    const totalStatus = dist.reduce((s, d) => s + d.count, 0);
    const completed = dist.find((d) => d.status === 'completed');
    if (totalStatus > 0 && completed) {
      insights.push({
        icon: 'check',
        label: 'Completion Rate',
        value: `${Math.round((completed.count / totalStatus) * 100)}%`,
      });
    }
    const topDoc = (analytics.doctor_wise_count || [])[0];
    if (topDoc) {
      insights.push({
        icon: 'award',
        label: 'Top Doctor',
        value: topDoc.doctor?.user?.name || '—',
        sub: `${topDoc.total} patients`,
      });
    }
  }

  // Reusable classes
  const inputBaseClass = 'w-full px-4 py-2.5 text-sm text-slate-800 bg-white border transition-all duration-200 focus:outline-none focus:ring-1 placeholder:text-slate-400 resize-none';
  const inputNormalClass = `${inputBaseClass} border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-teal-600/30`;
  const inputErrorClass = `${inputBaseClass} border-red-400 bg-red-50/40 focus:border-red-600 focus:ring-red-600/30`;
  const labelClass = 'block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5';
  const errorText = 'mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1';
  const thClass = 'px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 whitespace-nowrap';

  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  // Next-appointment summary (derived)
  const thisWeekCount = nextAppointments.filter((p) => {
    const d = new Date(p.consultation?.next_appointment);
    const now = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    return d >= now && d <= weekEnd;
  }).length;
  const doctorsInvolved = new Set(nextAppointments.map((p) => p.doctor_id)).size;

  return (
    <div className="flex min-h-screen bg-slate-100 antialiased">
      <Sidebar navItems={navItems} />

      <main className="flex-1 min-w-0">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
          body { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
          .font-display { font-family: 'Sora', sans-serif; }
          .dash-grid { background-image: linear-gradient(rgba(45,212,191,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.2) 1px, transparent 1px); background-size: 36px 36px; }
          .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scroll::-webkit-scrollbar-track { background: transparent; }
          .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; }
          .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>

        {/* ─────────────────────────── Header ─────────────────────────── */}
        <header className="relative overflow-hidden bg-slate-900">
          <div className="absolute inset-0 dash-grid opacity-20 pointer-events-none" />
          <div className="absolute -top-32 -right-20 w-96 h-96 bg-teal-500/15 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative px-4 sm:px-6 lg:px-10 pt-8 pb-28">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-[2px] bg-teal-500" />
                  <span className="text-teal-400 text-[11px] font-bold uppercase tracking-[0.3em]">Admin Control Center</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-3 tracking-tight">
                  {headerMeta.title}
                </h1>
                <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">{headerMeta.subtitle}</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">Today</p>
                  <p className="font-display text-white font-bold text-sm mt-1">{todayLabel}</p>
                </div>
                <ConnectionStatus />
              </div>
            </div>
          </div>
        </header>

        {/* ─────────────────────────── Tab bar ─────────────────────────── */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-10 -mt-16">
          <nav className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {TABS.map((tab, i) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-3 px-4 sm:px-5 py-4 shadow-sm text-left transition-all duration-200 border-l-4 ${
                    active
                      ? 'border-teal-500 bg-slate-900 text-white'
                      : 'border-transparent bg-white text-slate-500 hover:text-slate-900 hover:border-teal-400'
                  } ${i === TABS.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}
                >
                  <Icon
                    name={tab.icon}
                    className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-teal-400' : 'text-slate-400 group-hover:text-teal-600'}`}
                  />
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`ml-auto shrink-0 text-[10px] font-bold px-2 py-0.5 ${active ? 'bg-teal-500 text-white' : 'bg-slate-900 text-teal-400'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ─────────────────────────── Content ─────────────────────────── */}
        <div className="px-4 sm:px-6 lg:px-10 py-8 pb-16">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-600 px-5 py-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 bg-red-600 text-white flex items-center justify-center shrink-0">
                  <Icon name="alert" className="w-4 h-4" />
                </div>
                <p className="text-sm text-red-800 font-semibold truncate">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-700 shrink-0 transition-colors" aria-label="Dismiss">
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ══════════════ ANALYTICS TAB ══════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2 mb-4">
                  <span className="w-5 h-[2px] bg-teal-600" /> Filter Report
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className={labelClass}>From Date</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={`${inputNormalClass} w-auto`} />
                  </div>
                  <div>
                    <label className={labelClass}>To Date</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={`${inputNormalClass} w-auto`} />
                  </div>
                  <div>
                    <label className={labelClass}>Doctor</label>
                    <FieldSelect value={analyticsDoctor} onChange={(e) => setAnalyticsDoctor(e.target.value)} className={`${inputNormalClass} w-auto`}>
                      <option value="">All Doctors</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>{doc.user?.name}</option>
                      ))}
                    </FieldSelect>
                  </div>
                  <div>
                    <label className={labelClass}>Department</label>
                    <FieldSelect value={analyticsDept} onChange={(e) => setAnalyticsDept(e.target.value)} className={`${inputNormalClass} w-auto`}>
                      <option value="">All Departments</option>
                      {analytics?.departments?.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </FieldSelect>
                  </div>
                  <button
                    onClick={() => {
                      setFromDate(() => {
                        const d = new Date(); d.setDate(d.getDate() - 30);
                        return d.toISOString().split('T')[0];
                      });
                      setToDate(new Date().toISOString().split('T')[0]);
                      setAnalyticsDoctor('');
                      setAnalyticsDept('');
                    }}
                    className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-teal-400 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="refresh" className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>
              </div>

              {loading && !analytics ? (
                <div className="bg-white border border-slate-200 shadow-sm px-6 py-16 text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-slate-500 font-semibold text-xs uppercase tracking-widest">Loading analytics...</p>
                </div>
              ) : analytics ? (
                <>
                  {/* Key Insights strip (dark) */}
                  {insights.length > 0 && (
                    <div className="relative overflow-hidden bg-slate-900 border border-slate-900 shadow-sm">
                      <div className="absolute inset-0 dash-grid opacity-15 pointer-events-none" />
                      <div className="relative p-5 sm:p-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-400 flex items-center gap-2 mb-4">
                          <Icon name="zap" className="w-3.5 h-3.5" /> Key Insights — Auto-computed
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {insights.map((ins) => (
                            <div key={ins.label} className="bg-white/5 border border-white/10 px-4 py-3.5 flex items-center gap-3">
                              <div className="w-10 h-10 bg-teal-600/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
                                <Icon name={ins.icon} className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">{ins.label}</p>
                                <p className="font-display font-bold text-white text-sm mt-0.5 truncate">{ins.value}</p>
                                {ins.sub && <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{ins.sub}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard title="Total Patients" value={analytics.total_patients} icon="users" color="teal" sub="All-time registrations" />
                    <StatCard title="Patients (Range)" value={analytics.range_patients} icon="calendar" color="sky" sub="Selected date range" />
                    <StatCard title="Today's Patients" value={analytics.today_patients} icon="activity" color="emerald" sub="Registered today" />
                    <StatCard title="Active Doctors" value={analytics.active_doctors} icon="award" color="violet" sub="Currently practising" />
                  </div>

                  {/* Revenue */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <RevenueHeroCard label="Total Revenue" value={`₹${Number(analytics.total_revenue || 0).toLocaleString()}`} icon="dollar" />
                    <StatCard title="Today's Revenue" value={`₹${Number(analytics.today_revenue || 0).toLocaleString()}`} icon="dollar" color="emerald" sub="Collected today" />
                    <StatCard title="Monthly Revenue" value={`₹${Number(analytics.monthly_revenue || 0).toLocaleString()}`} icon="trending-up" color="teal" sub="This month" />
                  </div>

                  {/* Status & team overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <StatCard title="Pending" value={analytics.assigned_patients} icon="clock" color="amber" />
                    <StatCard title="In Consultation" value={analytics.consulted_patients} icon="clipboard" color="orange" />
                    <StatCard title="Completed" value={analytics.completed_patients} icon="check" color="emerald" />
                    <StatCard title="Receptionists" value={analytics.total_receptionists} icon="briefcase" color="slate" />
                    <StatCard title="Total Doctors" value={analytics.total_doctors} icon="user" color="sky" />
                  </div>

                  {/* Charts row 1 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard label="Workload" title="Patients per Doctor">
                      <div className="space-y-4">
                        {analytics.doctor_wise_count?.length > 0 ? (
                          analytics.doctor_wise_count.map((item) => {
                            const maxCount = Math.max(...analytics.doctor_wise_count.map((d) => d.total));
                            return (
                              <div key={item.doctor_id} className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-teal-50 border border-teal-300 text-teal-700 flex items-center justify-center font-display font-bold text-sm shrink-0">
                                  {initials(item.doctor?.user?.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-xs font-bold text-slate-700 truncate">{item.doctor?.user?.name || 'Unknown'}</span>
                                    <span className="font-display text-sm font-bold text-slate-900 shrink-0">{item.total}</span>
                                  </div>
                                  <div className="h-2.5 bg-slate-100">
                                    <div
                                      className="h-2.5 bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-500"
                                      style={{ width: `${maxCount > 0 ? (item.total / maxCount) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-400 font-medium">No data yet</p>
                        )}
                      </div>
                    </ChartCard>

                    <ChartCard label="Revenue" title="Revenue per Doctor">
                      <div className="space-y-4">
                        {analytics.doctor_revenue?.length > 0 ? (
                          analytics.doctor_revenue.map((item) => {
                            const maxRev = Math.max(...analytics.doctor_revenue.map((d) => d.revenue));
                            return (
                              <div key={item.doctor_id} className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center font-display font-bold text-sm shrink-0">
                                  {initials(item.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
                                    <span className="font-display text-sm font-bold text-emerald-600 shrink-0">₹{item.revenue.toLocaleString()}</span>
                                  </div>
                                  <div className="h-2.5 bg-slate-100">
                                    <div
                                      className="h-2.5 bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                                      style={{ width: `${maxRev > 0 ? (item.revenue / maxRev) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-400 font-medium">No revenue data</p>
                        )}
                      </div>
                    </ChartCard>
                  </div>

                  {/* Charts row 2 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard label="Trend" title="Daily Patient Flow">
                      {analytics.daily_stats?.length > 0 ? (
                        (() => {
                          const days = analytics.daily_stats;
                          const maxDay = Math.max(...days.map((d) => d.total));
                          const labelEvery = Math.max(1, Math.ceil(days.length / 8));
                          return (
                            <div>
                              <div className="flex items-end gap-1.5 h-40">
                                {days.map((day, i) => (
                                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group relative min-w-0">
                                    <div
                                      className="w-full bg-gradient-to-t from-teal-600 to-teal-400 transition-all duration-300 group-hover:from-teal-700 group-hover:to-teal-500"
                                      style={{ height: `${maxDay > 0 ? (day.total / maxDay) * 100 : 0}%`, minHeight: '4px' }}
                                    />
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                      {i % labelEvery === 0 || i === days.length - 1
                                        ? new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                                        : ''}
                                    </span>
                                    <div className="absolute -top-9 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 hidden group-hover:block whitespace-nowrap shadow-lg border-l-2 border-teal-500 z-10">
                                      {new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {day.total} patients
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                <span>{days.length} days tracked</span>
                                <span>Peak: <span className="text-teal-600">{maxDay} patients</span></span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-sm text-slate-400 font-medium">No daily data</p>
                      )}
                    </ChartCard>

                    <ChartCard label="Distribution" title="Appointment Status Split">
                      {analytics.status_distribution?.length > 0 ? (
                        <DonutChart data={analytics.status_distribution} />
                      ) : (
                        <p className="text-sm text-slate-400 font-medium">No status data</p>
                      )}
                    </ChartCard>
                  </div>
                </>
              ) : (
                <EmptyState icon="chart" message="No analytics data available" />
              )}
            </div>
          )}

          {/* ══════════════ NEXT APPOINTMENTS TAB ══════════════ */}
          {activeTab === 'nextAppointments' && (
            <div className="space-y-4">
              <div className="bg-teal-50 border-l-4 border-teal-600 px-5 py-4 text-sm text-teal-900 flex items-start gap-3 shadow-sm">
                <Icon name="zap" className="w-5 h-5 shrink-0 mt-0.5 text-teal-600" />
                <p className="font-medium">
                  Follow-up appointments set by doctors during consultation. Use the filters below to view patients for a specific day or doctor.
                </p>
              </div>

              {/* Filters */}
              <div className="bg-white border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 flex-wrap">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Date</label>
                  <input
                    type="date"
                    value={nextApptDate}
                    onChange={(e) => setNextApptDate(e.target.value)}
                    className={`${inputNormalClass} w-auto`}
                  />
                  <button
                    onClick={() => setNextApptDate('')}
                    className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-teal-400 hover:bg-slate-800 transition-colors"
                  >
                    All Upcoming
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Doctor</label>
                  <FieldSelect value={nextApptDoctor} onChange={(e) => setNextApptDoctor(e.target.value)} className={`${inputNormalClass} w-auto`}>
                    <option value="">All Doctors</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.user?.name}</option>
                    ))}
                  </FieldSelect>
                  <button
                    onClick={() => { setNextApptDate(''); setNextApptDoctor(''); }}
                    className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors flex items-center gap-2"
                  >
                    <Icon name="refresh" className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Total Follow-ups" value={nextAppointments.length} icon="calendar" color="violet" />
                <StatCard title="This Week" value={thisWeekCount} icon="zap" color="sky" sub="Next 7 days" />
                <StatCard title="Doctors Involved" value={doctorsInvolved} icon="user" color="teal" />
              </div>

              {loadingNext ? (
                <div className="bg-white border border-slate-200 shadow-sm px-6 py-16 text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-slate-500 font-semibold text-xs uppercase tracking-widest">Loading follow-ups...</p>
                </div>
              ) : nextAppointments.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  message={nextApptDate
                    ? `No follow-ups scheduled for ${new Date(nextApptDate + 'T00:00:00').toLocaleDateString()}`
                    : 'No upcoming follow-up appointments'}
                  subtitle="Follow-ups are set by doctors during consultation"
                />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block bg-white border border-slate-200 shadow-sm overflow-x-auto custom-scroll">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-slate-900">
                        <tr>
                          <th className={thClass}>Patient</th>
                          <th className={thClass}>Doctor</th>
                          <th className={thClass}>Follow-up Date</th>
                          <th className={thClass}>Status</th>
                          <th className={thClass}>Diagnosis</th>
                          <th className={`${thClass} !text-right`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {nextAppointments.map((patient) => (
                          <tr key={patient.id} className="hover:bg-teal-50/50 transition-colors duration-150">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-bold text-teal-700 text-sm shrink-0">
                                  {initials(patient.name)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{patient.name}</p>
                                  <p className="text-xs text-slate-500 font-medium">{patient.phone}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600 font-medium">{patient.doctor?.user?.name || '—'}</td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border bg-violet-50 text-violet-700 border-violet-300 whitespace-nowrap">
                                <Icon name="calendar" className="w-3.5 h-3.5" />
                                {patient.consultation?.next_appointment
                                  ? new Date(patient.consultation.next_appointment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4"><StatusBadge status={patient.status} /></td>
                            <td className="px-5 py-4 text-sm text-slate-600 max-w-[200px] truncate font-medium">
                              {patient.consultation?.diagnosis || '—'}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => handleWhatsAppEnquiry(patient)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-all duration-200 shadow-sm hover:-translate-y-0.5"
                                title="Send WhatsApp enquiry"
                              >
                                <Icon name="message" className="w-3.5 h-3.5" /> WhatsApp
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {nextAppointments.map((patient) => (
                      <div key={patient.id} className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-violet-600 via-teal-500 to-sky-500" />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-slate-900 text-teal-400 flex items-center justify-center font-display font-bold shrink-0">
                                {initials(patient.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{patient.name}</p>
                                <p className="text-xs text-slate-500">{patient.phone}</p>
                              </div>
                            </div>
                            <StatusBadge status={patient.status} />
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-100 text-xs">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Follow-up</p>
                              <p className="text-slate-800 font-bold mt-0.5">
                                {patient.consultation?.next_appointment
                                  ? new Date(patient.consultation.next_appointment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Doctor</p>
                              <p className="text-slate-800 font-semibold mt-0.5">{patient.doctor?.user?.name || '—'}</p>
                            </div>
                            {patient.consultation?.diagnosis && (
                              <div className="col-span-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Diagnosis</p>
                                <p className="text-slate-700 font-medium mt-0.5 line-clamp-2">{patient.consultation.diagnosis}</p>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleWhatsAppEnquiry(patient)}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-colors"
                          >
                            <Icon name="message" className="w-4 h-4" /> WhatsApp
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════ DOCTORS TAB ══════════════ */}
          {activeTab === 'doctors' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  {doctors.length} Doctor{doctors.length !== 1 ? 's' : ''} Registered
                </div>
                <button
                  onClick={() => openModal('doctor')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-teal-700 transition-all duration-200 shadow-sm hover:-translate-y-0.5"
                >
                  <Icon name="plus" className="w-4 h-4" /> Add Doctor
                </button>
              </div>

              {doctors.length === 0 ? (
                <EmptyState icon="user" message="No doctors found" subtitle='Click "Add Doctor" to create one' />
              ) : (
                <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto custom-scroll">
                  <table className="w-full min-w-[860px]">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className={thClass}>Doctor</th>
                        <th className={thClass}>Email</th>
                        <th className={thClass}>Specialization</th>
                        <th className={thClass}>Fee</th>
                        <th className={thClass}>Status</th>
                        <th className={`${thClass} !text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doctors.map((doc) => (
                        <tr key={doc.id} className="hover:bg-teal-50/50 transition-colors duration-150">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-teal-50 border border-teal-300 text-teal-700 flex items-center justify-center font-display font-bold text-sm shrink-0">
                                {initials(doc.user?.name)}
                              </div>
                              <span className="text-sm font-bold text-slate-900">{doc.user?.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600 font-medium">{doc.user?.email}</td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                              {doc.specialization}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-display font-bold text-slate-900">₹{doc.consultation_fee}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                                doc.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-red-50 text-red-700 border-red-300'
                              }`}>
                                <span className={`w-1.5 h-1.5 ${doc.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                {doc.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                                doc.availability === 'busy'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-teal-50 text-teal-700 border-teal-300'
                              }`}>
                                <span className={`w-1.5 h-1.5 ${doc.availability === 'busy' ? 'bg-amber-500' : 'bg-teal-500'}`} />
                                {doc.availability === 'busy' ? 'Busy' : 'Available'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => openModal('doctor', doc)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:border-teal-500 hover:text-teal-700 transition-colors"
                              >
                                <Icon name="edit" className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete('doctor', doc.id)}
                                disabled={deletingId === doc.id}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:border-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                {deletingId === doc.id ? <Spinner size="sm" /> : <Icon name="trash" className="w-3.5 h-3.5" />}
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ RECEPTIONISTS TAB ══════════════ */}
          {activeTab === 'receptionists' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  {receptionists.length} Receptionist{receptionists.length !== 1 ? 's' : ''} Registered
                </div>
                <button
                  onClick={() => openModal('receptionist')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-teal-700 transition-all duration-200 shadow-sm hover:-translate-y-0.5"
                >
                  <Icon name="plus" className="w-4 h-4" /> Add Receptionist
                </button>
              </div>

              {receptionists.length === 0 ? (
                <EmptyState icon="briefcase" message="No receptionists found" subtitle='Click "Add Receptionist" to create one' />
              ) : (
                <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto custom-scroll">
                  <table className="w-full min-w-[720px]">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className={thClass}>Receptionist</th>
                        <th className={thClass}>Email</th>
                        <th className={thClass}>Phone</th>
                        <th className={`${thClass} !text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receptionists.map((rec) => (
                        <tr key={rec.id} className="hover:bg-teal-50/50 transition-colors duration-150">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-sky-50 border border-sky-300 text-sky-700 flex items-center justify-center font-display font-bold text-sm shrink-0">
                                {initials(rec.name)}
                              </div>
                              <span className="text-sm font-bold text-slate-900">{rec.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600 font-medium">{rec.email}</td>
                          <td className="px-5 py-4 text-sm text-slate-600 font-medium">{rec.phone || '—'}</td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => openModal('receptionist', rec)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:border-teal-500 hover:text-teal-700 transition-colors"
                              >
                                <Icon name="edit" className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete('receptionist', rec.id)}
                                disabled={deletingId === rec.id}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:border-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                {deletingId === rec.id ? <Spinner size="sm" /> : <Icon name="trash" className="w-3.5 h-3.5" />}
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ PATIENTS TAB ══════════════ */}
          {activeTab === 'patients' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1 lg:max-w-xs">
                  <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`${inputNormalClass} pl-10`}
                  />
                </div>
                <FieldSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputNormalClass} lg:w-44`}>
                  <option value="">All Status</option>
                  <option value="assigned">Assigned</option>
                  <option value="consulted">Consulted</option>
                  <option value="completed">Completed</option>
                </FieldSelect>
                <FieldSelect value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)} className={`${inputNormalClass} lg:w-44`}>
                  <option value="">All Doctors</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.user?.name}</option>
                  ))}
                </FieldSelect>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className={`${inputNormalClass} lg:w-auto`}
                />
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 lg:ml-auto lg:self-center whitespace-nowrap">
                  {patients.length} Result{patients.length !== 1 ? 's' : ''}
                </div>
              </div>

              {loading ? (
                <div className="bg-white border border-slate-200 shadow-sm px-6 py-16 text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-slate-500 font-semibold text-xs uppercase tracking-widest">Loading patients...</p>
                </div>
              ) : patients.length === 0 ? (
                <EmptyState icon="users" message="No patients found" subtitle="Try adjusting your filters" />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block bg-white border border-slate-200 shadow-sm overflow-x-auto custom-scroll">
                    <table className="w-full min-w-[960px]">
                      <thead className="bg-slate-900">
                        <tr>
                          <th className={thClass}>Patient</th>
                          <th className={thClass}>Age / Gender</th>
                          <th className={thClass}>Phone</th>
                          <th className={thClass}>Doctor</th>
                          <th className={thClass}>Status</th>
                          <th className={thClass}>Date</th>
                          <th className={`${thClass} !text-right`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {patients.map((patient) => (
                          <tr key={patient.id} className="hover:bg-teal-50/50 transition-colors duration-150">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-bold text-teal-700 text-sm shrink-0">
                                  {initials(patient.name)}
                                </div>
                                <span className="text-sm font-bold text-slate-900">{patient.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600 font-medium capitalize">{patient.age} · {patient.gender}</td>
                            <td className="px-5 py-4 text-sm text-slate-600 font-medium">{patient.phone}</td>
                            <td className="px-5 py-4 text-sm text-slate-600 font-medium">{patient.doctor?.user?.name || '—'}</td>
                            <td className="px-5 py-4"><StatusBadge status={patient.status} /></td>
                            <td className="px-5 py-4 text-sm text-slate-600 font-medium whitespace-nowrap">
                              {new Date(patient.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => handleWhatsAppEnquiry(patient)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-all duration-200 shadow-sm hover:-translate-y-0.5"
                                title="Send WhatsApp enquiry"
                              >
                                <Icon name="message" className="w-3.5 h-3.5" /> WhatsApp
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {patients.map((patient) => (
                      <div key={patient.id} className="bg-white border border-slate-200 shadow-sm p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-bold text-teal-700 shrink-0">
                              {initials(patient.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{patient.name}</p>
                              <p className="text-xs text-slate-500 capitalize">{patient.age} yrs · {patient.gender}</p>
                            </div>
                          </div>
                          <StatusBadge status={patient.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-100 text-xs">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                            <p className="text-slate-700 font-semibold mt-0.5">{patient.phone}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Doctor</p>
                            <p className="text-slate-700 font-semibold mt-0.5">{patient.doctor?.user?.name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Registered</p>
                            <p className="text-slate-700 font-semibold mt-0.5">
                              {new Date(patient.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleWhatsAppEnquiry(patient)}
                          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-colors"
                        >
                          <Icon name="message" className="w-4 h-4" /> WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════ MODAL ══════════════ */}
          {showModal && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
              <div className="bg-white w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border-t-4 border-t-teal-600">
                {/* Modal header */}
                <div className="bg-slate-900 relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 dash-grid opacity-20 pointer-events-none" />
                  <div className="relative px-5 sm:px-6 py-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 bg-teal-600 text-white flex items-center justify-center shrink-0">
                        <Icon name={modalType === 'doctor' ? 'user' : 'briefcase'} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-400">
                          {editItem ? 'Edit' : 'Create'}
                        </p>
                        <h3 className="font-display text-lg font-bold text-white truncate">
                          {modalType === 'doctor' ? 'Doctor' : 'Receptionist'}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="w-9 h-9 border border-white/20 text-slate-300 hover:text-white hover:border-teal-500 flex items-center justify-center shrink-0 transition-colors"
                      aria-label="Close"
                    >
                      <Icon name="x" className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Modal body */}
                <div className="overflow-y-auto custom-scroll p-5 sm:p-6 space-y-5">
                  {modalErrors._general && (
                    <div className="bg-red-50 border-l-4 border-red-600 text-red-800 px-4 py-3 text-sm font-semibold flex items-center gap-2">
                      <Icon name="alert" className="w-4 h-4 shrink-0" /> {modalErrors._general}
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={formData.name || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (modalErrors.name) setModalErrors((p) => ({ ...p, name: '' }));
                      }}
                      className={modalErrors.name ? inputErrorClass : inputNormalClass}
                    />
                    {modalErrors.name && <p className={errorText}><Icon name="alert" className="w-3.5 h-3.5" /> {modalErrors.name}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={formData.email || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (modalErrors.email) setModalErrors((p) => ({ ...p, email: '' }));
                      }}
                      className={modalErrors.email ? inputErrorClass : inputNormalClass}
                    />
                    {modalErrors.email && <p className={errorText}><Icon name="alert" className="w-3.5 h-3.5" /> {modalErrors.email}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={inputNormalClass}
                    />
                  </div>

                  {modalType === 'doctor' && (
                    <>
                      <div>
                        <label className={labelClass}>Specialization <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g. Cardiology"
                          value={formData.specialization || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, specialization: e.target.value });
                            if (modalErrors.specialization) setModalErrors((p) => ({ ...p, specialization: '' }));
                          }}
                          className={modalErrors.specialization ? inputErrorClass : inputNormalClass}
                        />
                        {modalErrors.specialization && <p className={errorText}><Icon name="alert" className="w-3.5 h-3.5" /> {modalErrors.specialization}</p>}
                      </div>

                      <div>
                        <label className={labelClass}>Consultation Fee (₹)</label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={formData.consultation_fee || ''}
                          onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                          className={inputNormalClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Availability Hours</label>
                        <div className="flex gap-3">
                          <input
                            type="time"
                            value={formData.available_from || '09:00'}
                            onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                            className={inputNormalClass}
                          />
                          <input
                            type="time"
                            value={formData.available_to || '17:00'}
                            onChange={(e) => setFormData({ ...formData, available_to: e.target.value })}
                            className={inputNormalClass}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {!editItem && (
                    <>
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2 mb-4">
                          <span className="w-5 h-[2px] bg-teal-600" /> Account Security
                        </p>
                      </div>
                      <div>
                        <label className={labelClass}>Password <span className="text-red-500">*</span></label>
                        <input
                          type="password"
                          placeholder="Min 6 characters"
                          value={formData.password || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, password: e.target.value });
                            if (modalErrors.password) setModalErrors((p) => ({ ...p, password: '' }));
                          }}
                          className={modalErrors.password ? inputErrorClass : inputNormalClass}
                        />
                        {modalErrors.password && <p className={errorText}><Icon name="alert" className="w-3.5 h-3.5" /> {modalErrors.password}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Confirm Password <span className="text-red-500">*</span></label>
                        <input
                          type="password"
                          placeholder="Confirm password"
                          value={formData.password_confirmation || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, password_confirmation: e.target.value });
                            if (modalErrors.password_confirmation) setModalErrors((p) => ({ ...p, password_confirmation: '' }));
                          }}
                          className={modalErrors.password_confirmation ? inputErrorClass : inputNormalClass}
                        />
                        {modalErrors.password_confirmation && <p className={errorText}><Icon name="alert" className="w-3.5 h-3.5" /> {modalErrors.password_confirmation}</p>}
                      </div>
                    </>
                  )}
                </div>

                {/* Modal footer */}
                <div className="border-t border-slate-200 px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 bg-white">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-400 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-teal-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-teal-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all"
                  >
                    {saving && <Spinner />}
                    <span>{saving ? 'Saving...' : (editItem ? 'Update' : 'Create')}</span>
                    {!saving && <Icon name="check" className="w-4 h-4" strokeWidth={3} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}