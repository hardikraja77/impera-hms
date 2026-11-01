import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage, generateWhatsAppLink } from '../../api';
import Sidebar from '../../components/Sidebar';
import Spinner from '../../components/Spinner';
import ConnectionStatus from '../../components/ConnectionStatus';
import { useEchoChannel } from '../../hooks/useEcho';
import { useAuth } from '../../context/AuthContext';


const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: 'bg-amber-50 text-amber-700 border-amber-300',     dot: 'bg-amber-500' },
  in_progress: { label: 'In Progress', color: 'bg-orange-50 text-orange-700 border-orange-300',  dot: 'bg-orange-500' },
  consulted:   { label: 'Consulted',   color: 'bg-sky-50 text-sky-700 border-sky-300',           dot: 'bg-sky-500' },
  completed:   { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
};

// Accent themes per tab (Tailwind JIT-safe, full class names)
const ACCENT_MAP = {
  teal:    { edge: 'border-l-teal-500',    avatar: 'bg-teal-50 border-teal-300 text-teal-700',    hover: 'hover:border-teal-400', chip: 'text-teal-700' },
  amber:   { edge: 'border-l-amber-500',   avatar: 'bg-amber-50 border-amber-300 text-amber-700', hover: 'hover:border-amber-400', chip: 'text-amber-700' },
  emerald: { edge: 'border-l-emerald-500', avatar: 'bg-emerald-50 border-emerald-300 text-emerald-700', hover: 'hover:border-emerald-400', chip: 'text-emerald-700' },
  violet:  { edge: 'border-l-violet-500',  avatar: 'bg-violet-50 border-violet-300 text-violet-700', hover: 'hover:border-violet-400', chip: 'text-violet-700' },
};

/* --------------------------------- Icons ---------------------------------- */

const ICONS = {
  inbox: (<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>),
  clipboard: (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" /></>),
  'check-circle': (<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>),
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  check: <polyline points="20 6 9 17 4 12" />,
  x: (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  'file-text': (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>),
  edit: (<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>),
  message: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  smartphone: (<><rect x="5" y="2" width="14" height="20" /><line x1="12" y1="18" x2="12.01" y2="18" /></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>),
  clock: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  user: (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  alert: (<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
  thermometer: <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />,
  droplet: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  refresh: (<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>),
  arrow: (<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>),
};

function Icon({ name, className = 'w-5 h-5', strokeWidth = 2 }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

const initials = (name) => (name || '?').charAt(0).toUpperCase();

/* ------------------------------ Presentational ----------------------------- */

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap ${config.color}`}>
      <span className={`w-1.5 h-1.5 ${config.dot}`} />
      {config.label}
    </span>
  );
};

const EmptyState = ({ icon, message }) => (
  <div className="bg-white border border-slate-200 shadow-sm px-6 py-16 text-center">
    <div className="w-16 h-16 mx-auto border-2 border-slate-200 text-slate-300 flex items-center justify-center">
      <Icon name={icon} className="w-8 h-8" />
    </div>
    <p className="font-display font-bold text-slate-700 text-lg mt-5">{message}</p>
  </div>
);

const VitalPill = ({ icon, label, value }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
    <Icon name={icon} className="w-3.5 h-3.5 text-slate-400" />
    {label}: <span className="text-slate-900">{value}</span>
  </span>
);

/* ------------------------------ Patient Card ------------------------------- */

const PatientCard = ({ patient, actions, accentColor = 'teal' }) => {
  const accent = ACCENT_MAP[accentColor] || ACCENT_MAP.teal;
  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${accent.edge} shadow-sm overflow-hidden transition-all duration-200 ${accent.hover} hover:shadow-lg hover:-translate-y-0.5`}>
      <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        {/* Patient info */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className={`w-12 h-12 border flex items-center justify-center font-display font-bold text-lg shrink-0 ${accent.avatar}`}>
            {initials(patient.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-slate-900 tracking-tight">{patient.name}</h3>
              {patient.relation && patient.relation !== 'Myself' && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                  {patient.relation}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium mt-0.5 capitalize">
              {patient.age} yrs · {patient.gender} · <span className="font-semibold text-slate-700">{patient.phone}</span>
            </p>

            {patient.consultation?.symptoms && (
              <div className="mt-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Symptoms</p>
                <p className="text-xs text-slate-700 bg-slate-50 border-l-2 border-teal-500 px-3 py-2 leading-relaxed">
                  {patient.consultation.symptoms}
                </p>
              </div>
            )}

            {(patient.consultation?.temperature || patient.consultation?.blood_pressure || patient.consultation?.heart_rate) && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {patient.consultation.temperature && <VitalPill icon="thermometer" label="Temp" value={patient.consultation.temperature} />}
                {patient.consultation.blood_pressure && <VitalPill icon="droplet" label="BP" value={patient.consultation.blood_pressure} />}
                {patient.consultation.heart_rate && <VitalPill icon="activity" label="HR" value={patient.consultation.heart_rate} />}
              </div>
            )}

            {patient.creator?.name && (
              <p className="text-[10px] text-slate-400 mt-2.5 uppercase tracking-[0.2em] font-bold">
                Assigned by {patient.creator.name}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 lg:items-end lg:justify-end shrink-0 lg:pl-6 lg:border-l lg:border-slate-100">
          {actions}
        </div>
      </div>
    </div>
  );
};

/* Shared button styles */
const btnBase = 'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-200';
const btnPrimary = `${btnBase} bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:-translate-y-0.5`;
const btnEmerald = `${btnBase} bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:-translate-y-0.5`;
const btnGhost = `${btnBase} bg-white border border-slate-300 text-slate-600 hover:border-teal-500 hover:text-teal-700`;
const btnGreen = `${btnBase} bg-green-600 text-white hover:bg-green-700 shadow-sm hover:-translate-y-0.5`;

/* -------------------------------- Component -------------------------------- */

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState('enquiries');
  const [enquiries, setEnquiries] = useState([]);
  const [consulted, setConsulted] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [followupDate, setFollowupDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultationForm, setConsultationForm] = useState({
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
    next_appointment: '',
    temperature: '',
    blood_pressure: '',
    heart_rate: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Visit history state
  const [visitHistoryPatient, setVisitHistoryPatient] = useState(null);
  const [visitHistory, setVisitHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (activeTab === 'enquiries') {
        const res = await api.get('/doctor/new-enquiries');
        setEnquiries(res.data);
      } else if (activeTab === 'consulted') {
        const res = await api.get('/doctor/consulted-patients');
        setConsulted(res.data);
      } else if (activeTab === 'completed') {
        const res = await api.get('/doctor/completed-cases');
        setCompleted(res.data);
      } else if (activeTab === 'followups') {
        const params = new URLSearchParams();
        if (followupDate) params.append('date', followupDate);
        const res = await api.get(`/doctor/today-followups?${params.toString()}`);
        setFollowups(res.data);
      }
    } catch (err) {
      console.error('[Doctor] Fetch failed:', getErrorMessage(err));
    }
  }, [activeTab, followupDate]);

  // Load on mount / tab / date change — live updates arrive via WebSocket, no polling
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Real-time Echo subscriptions ──
  const { user } = useAuth();
  const doctorId = user?.doctor?.id;
  // Never subscribe to a "doctor.undefined" channel: if the doctor id is not
  // available yet, skip subscribing entirely (useEchoChannel ignores a null
  // channel). A bogus channel would fail authorization with a 403 while the
  // socket itself stays connected — looking "Live" but receiving nothing.
  const doctorChannel = doctorId ? `doctor.${doctorId}` : null;

  useEchoChannel(
    doctorChannel,
    '.patient.created',
    useCallback((e) => {
      showMsg('success', `📩 ${e.message}`);
      // Newly assigned patient — render the enquiry card instantly from the event payload
      setEnquiries((prev) =>
        prev.some((p) => p.id === e.patient.id)
          ? prev
          : [{
              id: e.patient.id,
              name: e.patient.name,
              age: e.patient.age,
              gender: e.patient.gender,
              phone: e.patient.phone,
              symptoms: e.patient.symptoms,
              status: e.patient.status,
              doctor: e.patient.doctor_name ? { user: { name: e.patient.doctor_name } } : null,
              creator: e.patient.creator_name ? { name: e.patient.creator_name } : null,
              appointment_time: e.patient.appointment_time,
              created_at: e.patient.created_at,
              consultation: null,
            }, ...prev]
      );
      // The event payload above has no consultation row (symptoms/vitals/creator live
      // on the consultation, not the patient broadcast), so when the doctor is on the
      // enquiries tab replace the shell card with the full server row right away.
      if (activeTab === 'enquiries') fetchData();
    }, [activeTab, fetchData])
  );

  useEchoChannel(
    doctorChannel,
    '.patient.status.updated',
    useCallback((e) => {
      const { id, status } = e.patient;
      const isEnquiry = ['pending', 'enquired', 'assigned'].includes(status);
      // Move the patient out of any list they no longer belong to
      setEnquiries((prev) => (isEnquiry ? prev : prev.filter((p) => p.id !== id)));
      setConsulted((prev) => (status === 'consulted' ? prev : prev.filter((p) => p.id !== id)));
      setCompleted((prev) => (status === 'completed' ? prev : prev.filter((p) => p.id !== id)));
      // The target list needs the full row (with consultation data) — fetch it once
      if (activeTab === 'enquiries' && isEnquiry) fetchData();
      else if (activeTab === 'consulted' && status === 'consulted') fetchData();
      else if (activeTab === 'completed' && status === 'completed') fetchData();
      else if (activeTab === 'followups') fetchData(); // follow-ups depend on consultation dates
    }, [activeTab, fetchData])
  );

  useEchoChannel(
    doctorChannel,
    '.consultation.updated',
    useCallback((e) => {
      const { patient_id: pid, patient_status } = e.consultation;
      if (patient_status === 'completed') {
        setEnquiries((prev) => prev.filter((p) => p.id !== pid));
        setConsulted((prev) => prev.filter((p) => p.id !== pid));
      }
      if (activeTab === 'consulted' || activeTab === 'completed' || activeTab === 'followups') fetchData();
    }, [activeTab, fetchData])
  );

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const startConsultation = async (patientId) => {
    try {
      await api.post(`/doctor/start-consultation/${patientId}`);
      showMsg('success', 'Consultation started!');
      fetchData();
      setActiveTab('consulted');
    } catch (err) {
      showMsg('error', getErrorMessage(err));
    }
  };

  const openConsultation = (patient) => {
    setSelectedPatient(patient);
    setConsultationForm({
      diagnosis: patient.consultation?.diagnosis || '',
      treatment: patient.consultation?.treatment || '',
      prescription: patient.consultation?.prescription || '',
      notes: patient.consultation?.notes || '',
      next_appointment: patient.consultation?.next_appointment
        ? (typeof patient.consultation.next_appointment === 'string'
            ? patient.consultation.next_appointment.split('T')[0]
            : new Date(patient.consultation.next_appointment).toISOString().split('T')[0])
        : '',
      temperature: patient.consultation?.temperature || '',
      blood_pressure: patient.consultation?.blood_pressure || '',
      heart_rate: patient.consultation?.heart_rate || '',
    });
  };

  const saveConsultation = async () => {
    setSaving(true);
    try {
      const consultationId = selectedPatient.consultation?.id;
      if (consultationId) {
        await api.put(`/doctor/consultation/${consultationId}`, consultationForm);
        showMsg('success', 'Consultation saved!');
        setSelectedPatient(null);
        fetchData();
      }
    } catch (err) {
      showMsg('error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const completeConsultation = async () => {
    setSaving(true);
    try {
      const consultationId = selectedPatient.consultation?.id;
      if (consultationId) {
        await api.post(`/doctor/complete-consultation/${consultationId}`, consultationForm);
        showMsg('success', consultationForm.next_appointment
          ? 'Consultation completed! Follow-up scheduled.'
          : 'Consultation completed!');
        setSelectedPatient(null);
        fetchData();
        setActiveTab('completed');
      }
    } catch (err) {
      showMsg('error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const loadVisitHistory = async (patientId) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/doctor/visit-history/${patientId}`);
      setVisitHistoryPatient(res.data.patient);
      setVisitHistory(res.data.visits || []);
    } catch (err) {
      showMsg('error', getErrorMessage(err));
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendWhatsAppReminder = async (patientId) => {
    try {
      const res = await api.post(`/doctor/whatsapp-reminder/${patientId}`);
      window.open(res.data.whatsapp_url, '_blank');
      fetchData();
    } catch (err) {
      showMsg('error', getErrorMessage(err));
    }
  };

  const handleWhatsAppEnquiry = (patient) => {
    const hospitalName = 'HealthCare';
    const doctorName = 'You';
    const appointmentDate = patient.consultation?.next_appointment
      ? new Date(patient.consultation.next_appointment).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');
    const appointmentTime = patient.consultation?.appointment_time
      ? new Date(patient.consultation.appointment_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : 'your scheduled time';

    const message = `Hello, this is regarding your appointment at ${hospitalName}.\n\nPatient: ${patient.name}\nDoctor: ${doctorName}\nScheduled Date: ${appointmentDate}\nTime: ${appointmentTime}\n\nPlease confirm your availability.`;

    const url = generateWhatsAppLink(patient.phone, message);
    window.open(url, '_blank');
  };

  // Sidebar nav (shared component API preserved)
  const navItems = [
    { id: 'enquiries', label: 'New Enquiries', icon: '📩', active: activeTab === 'enquiries', onClick: () => setActiveTab('enquiries'), badge: enquiries.length },
    { id: 'consulted', label: 'In Consultation', icon: '🩺', active: activeTab === 'consulted', onClick: () => setActiveTab('consulted') },
    { id: 'completed', label: 'Completed', icon: '✅', active: activeTab === 'completed', onClick: () => setActiveTab('completed') },
    { id: 'followups', label: "Today's Follow-ups", icon: '📅', active: activeTab === 'followups', onClick: () => setActiveTab('followups'), badge: followups.length },
  ];

  // ── Header tab bar ──
  const TABS = [
    { id: 'enquiries', label: 'New Enquiries', icon: 'inbox', badge: enquiries.length },
    { id: 'consulted', label: 'In Consultation', icon: 'clipboard' },
    { id: 'completed', label: 'Completed', icon: 'check-circle' },
    { id: 'followups', label: 'Follow-ups', icon: 'zap', badge: followups.length },
  ];

  const headerMeta =
    activeTab === 'enquiries'
      ? {
          title: 'New Enquiries',
          subtitle: 'Fresh patient requests assigned to you by reception. Review the details, check history, then start the consultation.',
        }
      : activeTab === 'consulted'
        ? {
            title: 'Patients In Consultation',
            subtitle: 'Patients currently in your care. Open a consultation to record diagnosis, treatment and prescriptions in real time.',
          }
        : activeTab === 'completed'
          ? {
              title: 'Completed Cases',
              subtitle: 'Closed consultations with full medical records. Revisit any case history at any time.',
            }
          : {
              title: 'Follow-up Queue',
              subtitle: 'Follow-ups you assigned, scheduled for the selected date. Send reminders with a single tap.',
            };

  // Reusable classes — sharp, modern, teal accent
  const inputBaseClass = 'w-full px-4 py-2.5 text-sm text-slate-800 bg-white border transition-all duration-200 focus:outline-none focus:ring-1 placeholder:text-slate-400 resize-none';
  const inputNormalClass = `${inputBaseClass} border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-teal-600/30`;
  const labelClass = 'block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5';
  const sectionLabel = 'text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2';

  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

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
                  <span className="text-teal-400 text-[11px] font-bold uppercase tracking-[0.3em]">Doctor Workspace</span>
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

        {/* ─────────────────────────── Tab bar (overlaps header) ─────────────── */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-10 -mt-16">
          <nav className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-3 px-4 sm:px-5 py-4 shadow-sm text-left transition-all duration-200 border-l-4 ${
                    active
                      ? 'border-teal-500 bg-slate-900 text-white'
                      : 'border-transparent bg-white text-slate-500 hover:text-slate-900 hover:border-teal-400'
                  }`}
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
          {msg.text && (
            <div className={`mb-6 px-5 py-4 flex items-center gap-3 shadow-sm border-l-4 ${
              msg.type === 'success'
                ? 'bg-emerald-50 border-emerald-600'
                : 'bg-red-50 border-red-600'
            }`}>
              <div className={`w-7 h-7 text-white flex items-center justify-center shrink-0 ${msg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                <Icon name={msg.type === 'success' ? 'check' : 'alert'} className="w-4 h-4" strokeWidth={3} />
              </div>
              <p className={`text-sm font-semibold ${msg.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>{msg.text}</p>
            </div>
          )}

          {/* ══════════════ NEW ENQUIRIES ══════════════ */}
          {activeTab === 'enquiries' && (
            <div className="space-y-4">
              {enquiries.length === 0 ? (
                <EmptyState icon="inbox" message="No new enquiries" />
              ) : (
                enquiries.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    accentColor="teal"
                    actions={
                      <>
                        <button onClick={() => loadVisitHistory(patient.id)} className={btnGhost} title="View visit history">
                          <Icon name="file-text" className="w-3.5 h-3.5" /> History
                        </button>
                        <button onClick={() => startConsultation(patient.id)} className={btnPrimary}>
                          <Icon name="arrow" className="w-3.5 h-3.5" /> Start Consult
                        </button>
                      </>
                    }
                  />
                ))
              )}
            </div>
          )}

          {/* ══════════════ IN CONSULTATION ══════════════ */}
          {activeTab === 'consulted' && (
            <div className="space-y-4">
              {consulted.length === 0 ? (
                <EmptyState icon="clipboard" message="No patients in consultation" />
              ) : (
                consulted.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    accentColor="amber"
                    actions={
                      <>
                        <button onClick={() => loadVisitHistory(patient.id)} className={btnGhost} title="View visit history">
                          <Icon name="file-text" className="w-3.5 h-3.5" /> History
                        </button>
                        {patient.consultation?.diagnosis && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 border border-amber-300 text-amber-700 text-[10px] font-bold uppercase tracking-widest">
                            <Icon name="edit" className="w-3.5 h-3.5" /> In Progress
                          </span>
                        )}
                        <button onClick={() => openConsultation(patient)} className={btnEmerald}>
                          <Icon name="edit" className="w-3.5 h-3.5" /> Open
                        </button>
                      </>
                    }
                  />
                ))
              )}
            </div>
          )}

          {/* ══════════════ COMPLETED CASES ══════════════ */}
          {activeTab === 'completed' && (
            <div className="space-y-4">
              {completed.length === 0 ? (
                <EmptyState icon="check-circle" message="No completed cases" />
              ) : (
                completed.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    accentColor="emerald"
                    actions={
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {patient.consultation?.diagnosis && (
                          <p
                            className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 max-w-[180px] truncate font-medium"
                            title={patient.consultation.diagnosis}
                          >
                            {patient.consultation.diagnosis}
                          </p>
                        )}
                        {patient.consultation?.next_appointment && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-bold uppercase tracking-widest">
                            <Icon name="calendar" className="w-3.5 h-3.5" />
                            {new Date(patient.consultation.next_appointment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <button onClick={() => loadVisitHistory(patient.id)} className={btnGhost}>
                          <Icon name="file-text" className="w-3.5 h-3.5" /> History
                        </button>
                        <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest">
                          <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} /> Done
                        </span>
                      </div>
                    }
                  />
                ))
              )}
            </div>
          )}

          {/* ══════════════ TODAY'S FOLLOW-UPS ══════════════ */}
          {activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Follow-up Date</label>
                <input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className={`${inputNormalClass} w-auto`}
                />
                <button
                  onClick={() => setFollowupDate(new Date().toISOString().split('T')[0])}
                  className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors"
                >
                  Today
                </button>
              </div>

              {followups.length === 0 ? (
                <EmptyState icon="calendar" message={`No follow-ups scheduled for ${new Date(followupDate + 'T00:00:00').toLocaleDateString()}`} />
              ) : (
                followups.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    accentColor="violet"
                    actions={
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {patient.consultation?.next_appointment && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold uppercase tracking-widest">
                            <Icon name="calendar" className="w-3.5 h-3.5" />
                            {new Date(patient.consultation.next_appointment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <button onClick={() => openConsultation(patient)} className={btnEmerald}>
                          <Icon name="edit" className="w-3.5 h-3.5" /> Consult
                        </button>
                        <button
                          onClick={() => sendWhatsAppReminder(patient.id)}
                          className={btnGhost}
                          title="Send WhatsApp reminder"
                        >
                          <Icon name="smartphone" className="w-3.5 h-3.5" /> App
                        </button>
                        <button
                          onClick={() => handleWhatsAppEnquiry(patient)}
                          className={btnGreen}
                          title="Send WhatsApp enquiry with appointment details"
                        >
                          <Icon name="message" className="w-3.5 h-3.5" /> Enquire
                        </button>
                      </div>
                    }
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* ─────────────────────── Consultation Modal ─────────────────────── */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-t-4 border-t-teal-600">
              {/* Modal header */}
              <div className="bg-slate-900 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 dash-grid opacity-20 pointer-events-none" />
                <div className="relative px-5 sm:px-6 py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-teal-600 text-white flex items-center justify-center font-display text-lg font-bold shrink-0">
                      {initials(selectedPatient.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-400">Consultation</p>
                      <h3 className="font-display text-lg font-bold text-white truncate">{selectedPatient.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">
                        {selectedPatient.age} yrs · {selectedPatient.gender} · {selectedPatient.phone}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="w-9 h-9 border border-white/20 text-slate-300 hover:text-white hover:border-teal-500 flex items-center justify-center shrink-0 transition-colors"
                    aria-label="Close"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="overflow-y-auto custom-scroll p-5 sm:p-6 space-y-5">
                {/* Recorded vitals */}
                {(selectedPatient.consultation?.temperature || selectedPatient.consultation?.blood_pressure || selectedPatient.consultation?.heart_rate) && (
                  <div className="bg-slate-900 p-4 relative overflow-hidden">
                    <div className="absolute inset-0 dash-grid opacity-15 pointer-events-none" />
                    <p className="relative text-[10px] font-bold uppercase tracking-[0.25em] text-teal-400 mb-3">
                      Visit Vitals · Recorded at Registration
                    </p>
                    <div className="relative grid grid-cols-3 gap-2">
                      {selectedPatient.consultation.temperature && (
                        <div className="bg-white/5 border border-white/10 px-3 py-2.5">
                          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <Icon name="thermometer" className="w-3.5 h-3.5 text-teal-400" /> Temp
                          </p>
                          <p className="font-display font-bold text-white text-sm mt-1">{selectedPatient.consultation.temperature}</p>
                        </div>
                      )}
                      {selectedPatient.consultation.blood_pressure && (
                        <div className="bg-white/5 border border-white/10 px-3 py-2.5">
                          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <Icon name="droplet" className="w-3.5 h-3.5 text-teal-400" /> BP
                          </p>
                          <p className="font-display font-bold text-white text-sm mt-1">{selectedPatient.consultation.blood_pressure}</p>
                        </div>
                      )}
                      {selectedPatient.consultation.heart_rate && (
                        <div className="bg-white/5 border border-white/10 px-3 py-2.5">
                          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <Icon name="activity" className="w-3.5 h-3.5 text-teal-400" /> HR
                          </p>
                          <p className="font-display font-bold text-white text-sm mt-1">{selectedPatient.consultation.heart_rate}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Symptoms */}
                {selectedPatient.consultation?.symptoms && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700 mb-1.5">Visit Symptoms</p>
                    <p className="text-sm text-amber-900 font-medium leading-relaxed">{selectedPatient.consultation.symptoms}</p>
                  </div>
                )}

                {/* Vitals inputs */}
                <div>
                  <h3 className={sectionLabel}><span className="w-5 h-[2px] bg-teal-600" /> Vitals</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div className="relative">
                      <Icon name="thermometer" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={consultationForm.temperature}
                        onChange={(e) => setConsultationForm({ ...consultationForm, temperature: e.target.value })}
                        className={`${inputNormalClass} pl-10`}
                        placeholder="98.6 °F"
                      />
                    </div>
                    <div className="relative">
                      <Icon name="droplet" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={consultationForm.blood_pressure}
                        onChange={(e) => setConsultationForm({ ...consultationForm, blood_pressure: e.target.value })}
                        className={`${inputNormalClass} pl-10`}
                        placeholder="120/80"
                      />
                    </div>
                    <div className="relative">
                      <Icon name="activity" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={consultationForm.heart_rate}
                        onChange={(e) => setConsultationForm({ ...consultationForm, heart_rate: e.target.value })}
                        className={`${inputNormalClass} pl-10`}
                        placeholder="72 bpm"
                      />
                    </div>
                  </div>
                </div>

                {/* Clinical notes */}
                <div>
                  <h3 className={sectionLabel}><span className="w-5 h-[2px] bg-teal-600" /> Clinical Record</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className={labelClass}>Diagnosis</label>
                      <textarea
                        value={consultationForm.diagnosis}
                        onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                        className={inputNormalClass}
                        rows={3}
                        placeholder="Enter diagnosis..."
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Treatment</label>
                      <textarea
                        value={consultationForm.treatment}
                        onChange={(e) => setConsultationForm({ ...consultationForm, treatment: e.target.value })}
                        className={inputNormalClass}
                        rows={3}
                        placeholder="Enter treatment plan..."
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Prescription</label>
                      <textarea
                        value={consultationForm.prescription}
                        onChange={(e) => setConsultationForm({ ...consultationForm, prescription: e.target.value })}
                        className={inputNormalClass}
                        rows={3}
                        placeholder="Enter prescription..."
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Notes</label>
                      <textarea
                        value={consultationForm.notes}
                        onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                        className={inputNormalClass}
                        rows={3}
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>

                {/* Next appointment */}
                <div>
                  <h3 className={sectionLabel}><span className="w-5 h-[2px] bg-teal-600" /> Follow-up</h3>
                  <div className="mt-3">
                    <label className={labelClass}>
                      Next Appointment
                      <span className="text-slate-400 font-medium normal-case tracking-normal ml-2">(optional — leave empty if no follow-up needed)</span>
                    </label>
                    <input
                      type="date"
                      value={consultationForm.next_appointment}
                      onChange={(e) => setConsultationForm({ ...consultationForm, next_appointment: e.target.value })}
                      className={inputNormalClass}
                    />
                    {consultationForm.next_appointment && (
                      <p className="mt-2.5 bg-teal-50 border border-teal-200 border-l-4 border-l-teal-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-teal-700 flex items-center gap-2">
                        <Icon name="check" className="w-4 h-4" strokeWidth={3} />
                        Follow-up scheduled for {new Date(consultationForm.next_appointment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="border-t border-slate-200 px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 bg-white">
                <button
                  onClick={() => setSelectedPatient(null)}
                  disabled={saving}
                  className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-400 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveConsultation}
                  disabled={saving}
                  className="px-6 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  {saving && <Spinner />}
                  <span>{saving ? 'Saving...' : 'Save Progress'}</span>
                </button>
                <button
                  onClick={completeConsultation}
                  disabled={saving}
                  className="px-6 py-3 bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  {saving && <Spinner />}
                  <span>{saving ? 'Saving...' : 'Complete & Save'}</span>
                  {!saving && <Icon name="check" className="w-4 h-4" strokeWidth={3} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────── Visit History Modal ─────────────────────── */}
        {visitHistoryPatient && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border-t-4 border-t-teal-600">
              {/* Modal header */}
              <div className="bg-slate-900 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 dash-grid opacity-20 pointer-events-none" />
                <div className="relative px-5 sm:px-6 py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-teal-600 text-white flex items-center justify-center font-display text-lg font-bold shrink-0">
                      {initials(visitHistoryPatient.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-400">Visit History</p>
                      <h3 className="font-display text-lg font-bold text-white truncate">{visitHistoryPatient.name}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => { setVisitHistoryPatient(null); setVisitHistory([]); }}
                    className="w-9 h-9 border border-white/20 text-slate-300 hover:text-white hover:border-teal-500 flex items-center justify-center shrink-0 transition-colors"
                    aria-label="Close"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>

                {/* Patient summary strip */}
                <div className="relative px-5 sm:px-6 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Phone', value: visitHistoryPatient.phone },
                    { label: 'Age', value: `${visitHistoryPatient.age} yrs` },
                    { label: 'Relation', value: visitHistoryPatient.relation || 'Myself' },
                    { label: 'Total Visits', value: visitHistory.length },
                  ].map((f) => (
                    <div key={f.label} className="bg-white/5 border border-white/10 px-3 py-2">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold">{f.label}</p>
                      <p className="text-white font-semibold text-xs mt-0.5 truncate">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal body */}
              <div className="overflow-y-auto custom-scroll p-5 sm:p-6">
                {loadingHistory ? (
                  <div className="text-center py-12">
                    <Spinner size="lg" />
                    <p className="mt-4 text-slate-500 font-semibold text-xs uppercase tracking-widest">Loading visit history...</p>
                  </div>
                ) : visitHistory.length === 0 ? (
                  <div className="text-center py-12 border border-slate-200 bg-slate-50">
                    <div className="w-14 h-14 mx-auto border-2 border-slate-200 text-slate-300 flex items-center justify-center">
                      <Icon name="file-text" className="w-7 h-7" />
                    </div>
                    <p className="text-slate-500 font-bold mt-4">No visit history found</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {visitHistory.map((visit, index) => (
                      <div key={visit.id} className="relative pl-6 pb-4 last:pb-0">
                        {index < visitHistory.length - 1 && (
                          <span className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200" />
                        )}
                        <span className={`absolute left-0 top-1.5 w-[11px] h-[11px] border-2 ${visit.status === 'completed' ? 'border-emerald-500' : 'border-teal-600'} bg-white`} />

                        <div className="bg-white border border-slate-200 p-4 hover:border-teal-400 transition-colors">
                          {/* Visit header */}
                          <div className="flex items-start justify-between gap-3 flex-wrap mb-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-teal-400">
                                Visit #{visitHistory.length - index}
                              </span>
                              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <Icon name="calendar" className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(visit.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <StatusBadge status={visit.status} />
                          </div>

                          {/* Doctor & appointment */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                            <div className="flex items-center gap-2">
                              <Icon name="user" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Doctor:</span>
                              <span className="text-slate-900 font-semibold">{visit.doctor?.user?.name || 'Unknown'}</span>
                            </div>
                            {visit.appointment_time && (
                              <div className="flex items-center gap-2">
                                <Icon name="clock" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Appointment:</span>
                                <span className="text-slate-900 font-semibold">{new Date(visit.appointment_time).toLocaleDateString('en-IN')}</span>
                              </div>
                            )}
                          </div>

                          {/* Symptoms */}
                          {visit.symptoms && (
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 mb-1">Symptoms</p>
                              <p className="text-xs text-amber-900 leading-relaxed">{visit.symptoms}</p>
                            </div>
                          )}

                          {/* Vitals */}
                          {(visit.temperature || visit.blood_pressure || visit.heart_rate) && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {visit.temperature && <VitalPill icon="thermometer" label="Temp" value={visit.temperature} />}
                              {visit.blood_pressure && <VitalPill icon="droplet" label="BP" value={visit.blood_pressure} />}
                              {visit.heart_rate && <VitalPill icon="activity" label="HR" value={visit.heart_rate} />}
                            </div>
                          )}

                          {/* Diagnosis / prescription */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {visit.diagnosis && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Diagnosis</p>
                                <p className="text-xs text-slate-800 bg-slate-50 border-l-2 border-teal-500 p-2.5 leading-relaxed">{visit.diagnosis}</p>
                              </div>
                            )}
                            {visit.prescription && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Prescription</p>
                                <p className="text-xs text-slate-800 bg-slate-50 border-l-2 border-teal-500 p-2.5 leading-relaxed">{visit.prescription}</p>
                              </div>
                            )}
                          </div>

                          {/* Follow-up */}
                          {visit.next_appointment && (
                            <div className="mt-3 bg-teal-50 border-l-4 border-teal-600 px-3 py-2.5 flex items-center gap-2">
                              <Icon name="zap" className="w-4 h-4 text-teal-600 shrink-0" />
                              <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
                                Follow-up: <span className="text-teal-900">{new Date(visit.next_appointment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}