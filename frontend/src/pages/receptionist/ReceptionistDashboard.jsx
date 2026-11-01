import { useState, useEffect, useRef, useCallback } from 'react';
import api, { getErrorMessage, generateWhatsAppLink } from '../../api';
import Sidebar from '../../components/Sidebar';
import Spinner from '../../components/Spinner';
import ConnectionStatus from '../../components/ConnectionStatus';
import { useEchoChannel } from '../../hooks/useEcho';
import { useAuth } from '../../context/AuthContext';

const RELATIONS = ['Myself', 'Father', 'Mother', 'Son', 'Daughter', 'Wife', 'Husband', 'Other'];

const STATUS_CONFIG = {
  pending:    { label: 'Pending',   color: 'bg-amber-50 text-amber-700 border-amber-300',   dot: 'bg-amber-500' },
  enquired:   { label: 'Enquired',  color: 'bg-sky-50 text-sky-700 border-sky-300',         dot: 'bg-sky-500' },
  assigned:   { label: 'Assigned',  color: 'bg-violet-50 text-violet-700 border-violet-300', dot: 'bg-violet-500' },
  consulted:  { label: 'Consulted', color: 'bg-orange-50 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
  completed:  { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
};


/* --------------------------------- Icons ---------------------------------- */

const ICONS = {
  search: (<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>),
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  users: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  user: (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  'user-plus': (<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="0" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>),
  clock: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  check: <polyline points="20 6 9 17 4 12" />,
  x: (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  message: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  refresh: (<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>),
  plus: (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  clipboard: (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="0" /></>),
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  alert: (<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
  thermometer: <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />,
  droplet: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
};

function Icon({ name, className = 'w-5 h-5', strokeWidth = 2 }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

const initials = (name) => (name || '?').charAt(0).toUpperCase();

/* ---------------------------- Presentational bits -------------------------- */

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap ${config.color}`}>
      <span className={`w-1.5 h-1.5 ${config.dot}`} />
      {config.label}
    </span>
  );
};

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

const EmptyState = ({ icon, title, subtitle }) => (
  <div className="bg-white border border-slate-200 shadow-sm px-6 py-16 text-center">
    <div className="w-16 h-16 mx-auto border-2 border-slate-200 text-slate-300 flex items-center justify-center">
      <Icon name={icon} className="w-8 h-8" />
    </div>
    <p className="font-display font-bold text-slate-700 text-lg mt-5">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wider">{subtitle}</p>}
  </div>
);

/* ------------------------------- Component --------------------------------- */

export default function ReceptionistDashboard() {
  const [activeTab, setActiveTab] = useState('add');
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [scheduledPatients, setScheduledPatients] = useState([]);
  const [nextAppointments, setNextAppointments] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [nextApptDate, setNextApptDate] = useState('');
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);

  // Smart phone detection
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneLookup, setPhoneLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [allVisitHistory, setAllVisitHistory] = useState([]);
  const [visitHistory, setVisitHistory] = useState([]);
  const lookupTimer = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    phone: '',
    symptoms: '',
    temperature: '',
    blood_pressure: '',
    heart_rate: '',
    doctor_id: '',
    relation: 'Myself',
    family_id: '',
    appointment_time: '',
  });
  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form mode: 'new' (brand new patient), 'visit' (new visit for existing), 'addMember' (add family member)
  const [formMode, setFormMode] = useState('new');

  // Whether we're creating a new visit vs new patient
  const isReturningPatient = phoneLookup?.exists && selectedPatient && formMode === 'visit';
  const isAddingMember = phoneLookup?.exists && formMode === 'addMember';

  const phoneCache = useRef({});

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await api.get('/receptionist/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error('[Receptionist] Failed to fetch doctors:', getErrorMessage(err));
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      const res = await api.get(`/receptionist/patients?${params.toString()}`);
      setPatients(res.data.data || []);
    } catch (err) {
      console.error('[Receptionist] Failed to fetch patients:', getErrorMessage(err));
    }
  }, [search, filterStatus]);

  const fetchScheduledPatients = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      const res = await api.get(`/receptionist/scheduled-patients?${params.toString()}`);
      setScheduledPatients(res.data || []);
    } catch (err) {
      console.error('[Receptionist] Failed to fetch scheduled patients:', getErrorMessage(err));
    } finally {
      setLoadingScheduled(false);
    }
  }, [dateFilter]);

  const fetchNextAppointments = useCallback(async () => {
    setLoadingNext(true);
    try {
      const params = new URLSearchParams();
      if (nextApptDate) params.append('date', nextApptDate);
      const res = await api.get(`/receptionist/next-appointments?${params.toString()}`);
      setNextAppointments(res.data || []);
    } catch (err) {
      console.error('[Receptionist] Failed to fetch next appointments:', getErrorMessage(err));
    } finally {
      setLoadingNext(false);
    }
  }, [nextApptDate]);

  // Load once when the schedule tab opens — live updates arrive via WebSocket, not polling
  useEffect(() => {
    if (activeTab === 'schedule') fetchScheduledPatients();
  }, [activeTab, fetchScheduledPatients]);

  useEffect(() => {
    if (activeTab === 'next') fetchNextAppointments();
  }, [nextApptDate, activeTab, fetchNextAppointments]);

  // ── Real-time Echo subscriptions (state updates straight from events — no polling) ──
  const { user } = useAuth();

  useEchoChannel(
    `receptionist.${user?.id}`,
    '.patient.status.updated',
    useCallback((e) => {
      const p = e.patient;
      setScheduledPatients((prev) =>
        prev.map((row) => (row.id === p.id ? { ...row, status: p.status } : row))
      );
      setPatients((prev) =>
        prev.map((row) => (row.id === p.id ? { ...row, status: p.status } : row))
      );
      setSuccess(`🔄 ${e.message}`);
      setTimeout(() => setSuccess(''), 3000);
    }, [])
  );

  useEchoChannel(
    `receptionist.${user?.id}`,
    '.consultation.updated',
    useCallback((e) => {
      const c = e.consultation;
      setScheduledPatients((prev) =>
        prev.map((row) => (row.id === c.patient_id ? { ...row, status: c.patient_status } : row))
      );
      setPatients((prev) =>
        prev.map((row) => (row.id === c.patient_id ? { ...row, status: c.patient_status } : row))
      );
      setSuccess(`🔄 ${e.message}`);
      setTimeout(() => setSuccess(''), 3000);
    }, [])
  );

  // Doctor availability (busy/available) on the shared receptionist dashboard channel
  useEchoChannel(
    'receptionist.dashboard',
    '.doctor.availability.changed',
    useCallback((e) => {
      setDoctors((prev) =>
        prev.map((d) => (d.id === e.doctor.id ? { ...d, availability: e.doctor.status } : d))
      );
    }, [])
  );

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (activeTab === 'list') fetchPatients();
  }, [activeTab, fetchPatients]);

  // Smart phone lookup with debounce
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);

    const phone = phoneInput.trim();
    if (phone.length < 10) {
      setPhoneLookup(null);
      setSelectedPatient(null);
      setFamilyMembers([]);
      setVisitHistory([]);
      return;
    }

    if (phoneCache.current[phone]) {
      handlePhoneResult(phoneCache.current[phone]);
      return;
    }

    setLookupLoading(true);
    lookupTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/receptionist/patients/by-phone?phone=${encodeURIComponent(phone)}`);
        phoneCache.current[phone] = res.data;
        handlePhoneResult(res.data);
      } catch (err) {
        console.error('[Receptionist] Phone lookup failed:', getErrorMessage(err));
        setPhoneLookup({ exists: false, message: 'Error checking phone number' });
      } finally {
        setLookupLoading(false);
      }
    }, 600);

    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [phoneInput]);

  const handlePhoneResult = (data) => {
    setPhoneLookup(data);
    if (data.exists) {
      setSelectedPatient(data.patient);
      setFamilyMembers(data.family_members || []);
      // Store all visits and filter by selected patient
      const allVisits = data.visit_history || [];
      setAllVisitHistory(allVisits);
      setVisitHistory(allVisits.filter((v) => v.patient_id === data.patient.id));
      setFormMode('visit');
      // Pre-fill form with patient profile for new visit
      setFormData((prev) => ({
        ...prev,
        name: data.patient.name,
        age: data.patient.age,
        gender: data.patient.gender,
        phone: data.patient.phone,
        family_id: data.patient.family_id || data.patient.id,
        symptoms: '',
        temperature: '',
        blood_pressure: '',
        heart_rate: '',
        doctor_id: '',
        appointment_time: '',
        relation: data.patient.relation || 'Myself',
      }));
    } else {
      setSelectedPatient(null);
      setFamilyMembers([]);
      setVisitHistory([]);
      setFormMode('new');
      setFormData((prev) => ({ ...prev, phone: phoneInput.trim() }));
    }
  };

  const switchToAddMember = () => {
    setFormMode('addMember');
    setSelectedPatient(null);
    // Clear form but keep phone and family_id
    setFormData((prev) => ({
      ...prev,
      name: '',
      age: '',
      gender: 'male',
      symptoms: '',
      temperature: '',
      blood_pressure: '',
      heart_rate: '',
      doctor_id: '',
      appointment_time: '',
      relation: 'Father',
    }));
    setFieldErrors({});
    setTouched({});
  };

  const switchToNewVisit = (member) => {
    setFormMode('visit');
    if (member) {
      selectFamilyMember(member);
    }
  };

  const selectFamilyMember = (member) => {
    setSelectedPatient(member);
    // Filter visit history to show only this member's visits
    setVisitHistory(allVisitHistory.filter((v) => v.patient_id === member.id));
    setFormData((prev) => ({
      ...prev,
      name: member.name,
      age: member.age,
      gender: member.gender,
      phone: member.phone,
      family_id: member.family_id || member.id,
      symptoms: '',
      temperature: '',
      blood_pressure: '',
      heart_rate: '',
      doctor_id: '',
      appointment_time: '',
      relation: member.relation || 'Myself',
    }));
  };

  const clearPhoneLookup = () => {
    setPhoneLookup(null);
    setSelectedPatient(null);
    setFamilyMembers([]);
    setAllVisitHistory([]);
    setVisitHistory([]);
    setPhoneInput('');
    setFormMode('new');
    phoneCache.current = {};
    setFormData({
      name: '',
      age: '',
      gender: 'male',
      phone: '',
      symptoms: '',
      temperature: '',
      blood_pressure: '',
      heart_rate: '',
      doctor_id: '',
      relation: 'Myself',
      family_id: '',
      appointment_time: '',
    });
    setFieldErrors({});
    setTouched({});
  };

  const validateField = (field, value) => {
    if (field === 'name' && !value?.trim()) return 'Patient name is required';
    if (field === 'age') {
      if (!value) return 'Age is required';
      if (isNaN(value) || Number(value) < 1 || Number(value) > 150) return 'Enter a valid age (1-150)';
    }
    if (field === 'phone' && !value?.trim()) return 'Phone number is required';
    if (field === 'doctor_id' && !value) return 'Please select a doctor';
    return '';
  };

  const validateForm = () => {
    const errs = {};
    errs.name = validateField('name', formData.name);
    errs.age = validateField('age', formData.age);
    errs.phone = validateField('phone', formData.phone);
    errs.doctor_id = validateField('doctor_id', formData.doctor_id);
    setFieldErrors(errs);
    setTouched({ name: true, age: true, phone: true, doctor_id: true });
    return !errs.name && !errs.age && !errs.phone && !errs.doctor_id;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, formData[field]) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (isReturningPatient) {
        // ── New Visit for existing patient ──
        const payload = {
          patient_id: selectedPatient.id,
          symptoms: formData.symptoms || null,
          temperature: formData.temperature || null,
          blood_pressure: formData.blood_pressure || null,
          heart_rate: formData.heart_rate || null,
          doctor_id: formData.doctor_id,
          appointment_time: formData.appointment_time || null,
        };
        await api.post('/receptionist/visits', payload);
        setSuccess(`New visit created for ${selectedPatient.name}!`);
      } else if (isAddingMember) {
        // ── Add new family member under existing phone ──
        const payload = {
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          phone: phoneLookup.patient.phone,
          doctor_id: formData.doctor_id,
          relation: formData.relation || 'Father',
          family_id: phoneLookup.patient.family_id || phoneLookup.patient.id,
          symptoms: formData.symptoms || null,
          temperature: formData.temperature || null,
          blood_pressure: formData.blood_pressure || null,
          heart_rate: formData.heart_rate || null,
          appointment_time: formData.appointment_time || null,
        };
        await api.post('/receptionist/patients', payload);
        setSuccess(`${formData.name} (${formData.relation}) added as a family member!`);
      } else {
        // ── New patient registration ──
        const payload = {
          ...formData,
          family_id: formData.family_id || null,
          relation: formData.relation || 'Myself',
          appointment_time: formData.appointment_time || null,
        };
        await api.post('/receptionist/patients', payload);
        setSuccess('Patient registered and assigned to doctor successfully!');
      }

      // Clear form
      clearPhoneLookup();
      setPhoneInput('');

      fetchScheduledPatients();
      if (activeTab === 'list') fetchPatients();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const msg = getErrorMessage(err);
      if (err.response?.data?.errors) {
        const serverErrors = err.response.data.errors;
        const mapped = {};
        for (const [key, val] of Object.entries(serverErrors)) {
          mapped[key] = Array.isArray(val) ? val[0] : val;
        }
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
        setTouched({ name: true, age: true, phone: true, doctor_id: true });
      } else {
        setErrors({ _general: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppEnquiry = async (patient) => {
    try {
      const res = await api.post(`/receptionist/patients/${patient.id}/whatsapp-enquiry`);
      if (res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }
      setScheduledPatients((prev) =>
        prev.map((p) => (p.id === patient.id ? { ...p, status: 'enquired' } : p))
      );
      setPatients((prev) =>
        prev.map((p) => (p.id === patient.id ? { ...p, status: 'enquired' } : p))
      );
      setSuccess('WhatsApp enquiry sent and status updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('[Receptionist] WhatsApp enquiry failed:', getErrorMessage(err));
      setErrors({ _general: 'Failed to send WhatsApp enquiry' });
    }
  };

  const handleWhatsAppDirect = (patient) => {
    const hospitalName = 'HealthCare';
    const doctorName = patient.doctor?.user?.name || 'Unassigned';
    const consultation = patient.consultation;
    const appointmentDate = consultation?.appointment_time
      ? new Date(consultation.appointment_time).toLocaleDateString('en-IN')
      : new Date(patient.created_at).toLocaleDateString('en-IN');
    const appointmentTime = consultation?.appointment_time
      ? new Date(consultation.appointment_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : 'Not scheduled';

    const message = `Hello, this is regarding your appointment at ${hospitalName}.\n\nPatient: ${patient.name}\nDoctor: ${doctorName}\nScheduled Date: ${appointmentDate}\nTime: ${appointmentTime}\n\nPlease confirm your availability.`;

    const url = generateWhatsAppLink(patient.phone, message);
    window.open(url, '_blank');
  };

  const handleStatusChange = async (patientId, newStatus) => {
    try {
      await api.put(`/receptionist/patients/${patientId}/status`, { status: newStatus });
      setScheduledPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, status: newStatus } : p))
      );
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error('[Receptionist] Status update failed:', getErrorMessage(err));
    }
  };

  const navItems = [
    { id: 'add', label: isReturningPatient ? 'New Visit' : isAddingMember ? 'Add Member' : 'Add Patient', icon: isReturningPatient ? '🔄' : isAddingMember ? '👨‍👩‍👧' : '➕', active: activeTab === 'add', onClick: () => setActiveTab('add') },
    { id: 'list', label: 'Patient List', icon: '📋', active: activeTab === 'list', onClick: () => setActiveTab('list') },
    { id: 'schedule', label: 'Today\'s Appointments', icon: '📅', active: activeTab === 'schedule', onClick: () => setActiveTab('schedule') },
    { id: 'next', label: 'Next Appointments', icon: '🔮', active: activeTab === 'next', onClick: () => setActiveTab('next'), badge: nextAppointments.length },
  ];

  // ── Derived display data ──
  const familyMemberCards =
    phoneLookup?.exists && phoneLookup?.patient && !familyMembers.some((m) => m.id === phoneLookup.patient.id)
      ? [phoneLookup.patient, ...familyMembers]
      : familyMembers;

  const TABS = [
    { id: 'add', label: isReturningPatient ? 'New Visit' : isAddingMember ? 'Add Member' : 'Register', icon: isReturningPatient ? 'refresh' : isAddingMember ? 'user-plus' : 'plus' },
    { id: 'list', label: 'Patients', icon: 'clipboard' },
    { id: 'schedule', label: "Today's Schedule", icon: 'calendar' },
    { id: 'next', label: 'Follow-ups', icon: 'zap', badge: nextAppointments.length },
  ];

  const headerMeta =
    activeTab === 'add'
      ? {
          title: isReturningPatient ? 'New Visit' : isAddingMember ? 'Add Family Member' : 'Register New Patient',
          subtitle: isReturningPatient
            ? `Creating a new visit for ${selectedPatient?.name}. The existing profile stays untouched — just fill in today's visit details.`
            : isAddingMember
              ? 'Link a new member to an existing family account in a few quick steps.'
              : 'Start with the phone number — returning patients and family members are detected automatically.',
        }
      : activeTab === 'list'
        ? { title: 'Patient Directory', subtitle: 'Search, filter and reach out to every registered patient in one place.' }
        : activeTab === 'schedule'
          ? { title: "Today's Appointments", subtitle: 'The live schedule board — updates instantly via WebSocket, no refresh needed.' }
          : { title: 'Follow-up Queue', subtitle: 'Doctor-assigned next appointments, ready for confirmation and WhatsApp reminders.' };

  // Reusable input classes — sharp, modern, teal accent
  const inputBaseClass = 'w-full px-4 py-2.5 text-sm text-slate-800 bg-white border transition-all duration-200 focus:outline-none focus:ring-1 placeholder:text-slate-400';
  const inputNormalClass = `${inputBaseClass} border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-teal-600/30`;
  const inputErrorClass = `${inputBaseClass} border-red-400 bg-red-50/40 focus:border-red-600 focus:ring-red-600/30`;
  const labelClass = 'block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5';
  const errorText = 'mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1';

  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const pendingCount = scheduledPatients.filter((p) => p.status === 'pending' || p.status === 'assigned').length;
  const completedCount = scheduledPatients.filter((p) => p.status === 'completed').length;

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
                  <span className="text-teal-400 text-[11px] font-bold uppercase tracking-[0.3em]">Receptionist Workspace</span>
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
          {success && (
            <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-600 px-5 py-4 flex items-center gap-3 shadow-sm">
              <div className="w-7 h-7 bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Icon name="check" className="w-4 h-4" strokeWidth={3} />
              </div>
              <p className="text-sm text-emerald-800 font-semibold">{success}</p>
            </div>
          )}

          {errors._general && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-600 px-5 py-4 flex items-center gap-3 shadow-sm">
              <div className="w-7 h-7 bg-red-600 text-white flex items-center justify-center shrink-0">
                <Icon name="alert" className="w-4 h-4" />
              </div>
              <p className="text-sm text-red-800 font-semibold">{errors._general}</p>
            </div>
          )}

          {/* ══════════════ ADD PATIENT / NEW VISIT TAB ══════════════ */}
          {activeTab === 'add' && (
            <div className="max-w-4xl space-y-6">
              {/* ── Smart Phone Lookup Card ── */}
              <div className="bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <Icon name="search" className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-slate-900">Smart Patient Lookup</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Auto-detects existing patients & family members</p>
                    </div>
                  </div>
                  {phoneLookup?.exists && !lookupLoading && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500" /> Match Found
                    </span>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  <label className={labelClass}>Phone Number</label>
                  <div className="relative">
                    <Icon name="phone" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className={`${inputNormalClass} pl-11 ${lookupLoading || phoneInput ? 'pr-11' : ''}`}
                      placeholder="Enter phone number to search..."
                    />
                    {lookupLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Spinner />
                      </div>
                    )}
                    {!lookupLoading && phoneInput && (
                      <button
                        type="button"
                        onClick={clearPhoneLookup}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition-colors"
                        aria-label="Clear"
                      >
                        <Icon name="x" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Lookup triggers automatically once 10 digits are entered.</p>

                  {phoneLookup && !lookupLoading && (
                    <div className="mt-5">
                      {phoneLookup.exists ? (
                        <div className="border border-teal-200 bg-teal-50/50 p-5">
                          {/* Found header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <Icon name="check" className="w-5 h-5" strokeWidth={3} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Existing Patient Found</p>
                                <p className="font-display font-bold text-slate-900 text-lg leading-tight truncate">{selectedPatient?.name}</p>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-teal-400 px-2.5 py-1 whitespace-nowrap">
                                {selectedPatient?.relation || 'Myself'}
                              </span>
                            </div>
                            <button
                              onClick={clearPhoneLookup}
                              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                            >
                              <Icon name="x" className="w-3.5 h-3.5" /> Clear
                            </button>
                          </div>

                          {/* Family member profile cards */}
                          {familyMemberCards.length > 0 && (
                            <div className="mb-5">
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2.5">Select Profile</p>
                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {familyMemberCards.map((member) => {
                                  const active = selectedPatient?.id === member.id;
                                  return (
                                    <button
                                      key={member.id}
                                      onClick={() => selectFamilyMember(member)}
                                      className={`relative p-3 text-left border transition-all duration-200 ${
                                        active
                                          ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600'
                                          : 'border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/40'
                                      }`}
                                    >
                                      {active && (
                                        <span className="absolute top-2 right-2 w-4 h-4 bg-teal-600 text-white flex items-center justify-center">
                                          <Icon name="check" className="w-2.5 h-2.5" strokeWidth={4} />
                                        </span>
                                      )}
                                      <div className="flex items-center gap-2.5 pr-4">
                                        <div className={`w-9 h-9 flex items-center justify-center font-display font-bold text-sm shrink-0 ${active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                          {initials(member.name)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                                          <p className="text-[11px] text-slate-500">{member.relation || 'Myself'} · {member.age} yrs</p>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Visit history — timeline */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                Visit History — <span className="text-slate-900">{selectedPatient?.name}</span>
                              </p>
                              <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5">
                                {visitHistory.length} total
                              </span>
                            </div>
                            {visitHistory.length > 0 ? (
                              <div className="space-y-0 max-h-56 overflow-y-auto pr-1 custom-scroll">
                                {visitHistory.slice(0, 5).map((visit, i) => (
                                  <div key={visit.id} className="relative pl-6 pb-3 last:pb-0">
                                    {i < Math.min(visitHistory.length, 5) - 1 && (
                                      <span className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200" />
                                    )}
                                    <span className="absolute left-0 top-1.5 w-[11px] h-[11px] border-2 border-teal-600 bg-white" />
                                    <div className="bg-white border border-slate-200 p-3 hover:border-teal-400 transition-colors">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <p className="text-xs font-bold text-slate-900">Dr. {visit.doctor?.user?.name || 'Unknown'}</p>
                                        <StatusBadge status={visit.status} />
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">{visit.symptoms || 'No symptoms recorded'}</p>
                                      {visit.diagnosis && (
                                        <p className="text-xs text-teal-800 font-semibold mt-1.5 bg-teal-50 border-l-2 border-teal-500 px-2 py-1 inline-block">
                                          Diagnosis: {visit.diagnosis}
                                        </p>
                                      )}
                                      <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wider">
                                        {new Date(visit.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No previous visits found for {selectedPatient?.name}.</p>
                            )}
                          </div>

                          {/* Mode toggle */}
                          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => switchToNewVisit(null)}
                              className={`flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-2 transition-all duration-200 ${
                                formMode === 'visit'
                                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-500 hover:text-emerald-600'
                              }`}
                            >
                              <Icon name="refresh" className="w-4 h-4" /> New Visit — {selectedPatient?.name}
                            </button>
                            <button
                              type="button"
                              onClick={switchToAddMember}
                              className={`flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-2 transition-all duration-200 ${
                                formMode === 'addMember'
                                  ? 'border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-600/20'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-sky-500 hover:text-sky-600'
                              }`}
                            >
                              <Icon name="user-plus" className="w-4 h-4" /> Add Family Member
                            </button>
                          </div>

                          {formMode === 'visit' && (
                            <div className="mt-4 bg-emerald-50 border-l-4 border-emerald-600 p-4">
                              <p className="text-sm text-emerald-900 font-bold">Ready to create a new visit for {selectedPatient?.name}</p>
                              <p className="text-xs text-emerald-700 mt-1">
                                Fill in the visit details below. The patient profile will remain unchanged.
                              </p>
                            </div>
                          )}
                          {formMode === 'addMember' && (
                            <div className="mt-4 bg-sky-50 border-l-4 border-sky-600 p-4">
                              <p className="text-sm text-sky-900 font-bold">
                                Adding a new family member under {phoneLookup?.patient?.phone}
                              </p>
                              <p className="text-xs text-sky-700 mt-1">
                                Fill in the new member's details below. They will be linked to this family.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-l-4 border-amber-500 bg-amber-50 px-5 py-4 flex items-start gap-3">
                          <div className="w-8 h-8 bg-amber-500 text-white flex items-center justify-center shrink-0">
                            <Icon name="user" className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm text-amber-900 font-bold">New Patient</p>
                            <p className="text-xs text-amber-800 mt-0.5">
                              No existing record found for this number — complete the registration form below.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Registration / New Visit Form ── */}
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
                  <div
                    className={`w-10 h-10 text-white flex items-center justify-center shrink-0 ${
                      isReturningPatient ? 'bg-emerald-600' : isAddingMember ? 'bg-sky-600' : 'bg-teal-600'
                    }`}
                  >
                    <Icon name={isReturningPatient ? 'refresh' : isAddingMember ? 'user-plus' : 'plus'} className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-slate-900">
                      {isReturningPatient ? (
                        <>New Visit — <span className="text-teal-600">{selectedPatient.name}</span></>
                      ) : isAddingMember ? (
                        <>Add Family Member — <span className="text-teal-600">{phoneLookup?.patient?.phone}</span></>
                      ) : (
                        'New Patient Registration'
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isReturningPatient
                        ? 'Existing patient record · profile locked'
                        : isAddingMember
                          ? 'New member will be linked to the family account'
                          : 'Fields marked * are required'}
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  {/* Profile section */}
                  {isReturningPatient ? (
                    <div className="bg-slate-900 text-white p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-28 h-28 bg-teal-500/10 rotate-45 translate-x-12 -translate-y-12 pointer-events-none" />
                      <div className="relative flex items-center gap-4">
                        <div className="w-14 h-14 bg-teal-600 flex items-center justify-center font-display text-xl font-bold shrink-0">
                          {initials(selectedPatient.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.25em] text-teal-400 font-bold">Existing Record · Locked</p>
                          <p className="font-display text-lg font-bold truncate">{selectedPatient.name}</p>
                        </div>
                      </div>
                      <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 mt-5 pt-4 border-t border-white/10">
                        {[
                          { label: 'Age', value: `${selectedPatient.age} yrs` },
                          { label: 'Gender', value: selectedPatient.gender },
                          { label: 'Phone', value: selectedPatient.phone },
                          { label: 'Relation', value: selectedPatient.relation || 'Myself' },
                          { label: 'Total Visits', value: visitHistory.length },
                        ].map((f) => (
                          <div key={f.label}>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">{f.label}</p>
                            <p className="font-semibold text-sm mt-0.5 capitalize">{f.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Patient Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                              setFormData({ ...formData, name: e.target.value });
                              if (touched.name) setFieldErrors((p) => ({ ...p, name: validateField('name', e.target.value) }));
                            }}
                            onBlur={() => handleBlur('name')}
                            className={touched.name && fieldErrors.name ? inputErrorClass : inputNormalClass}
                            placeholder="Enter full name"
                          />
                          {touched.name && fieldErrors.name && (
                            <p className={errorText}><Icon name="alert" className="w-3.5 h-3.5" /> {fieldErrors.name}</p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Age <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => {
                              setFormData({ ...formData, age: e.target.value });
                              if (touched.age) setFieldErrors((p) => ({ ...p, age: validateField('age', e.target.value) }));
                            }}
                            onBlur={() => handleBlur('age')}
                            className={touched.age && fieldErrors.age ? inputErrorClass : inputNormalClass}
                            placeholder="Age"
                            min="1"
                            max="150"
                          />
                          {touched.age && fieldErrors.age && (
                            <p className={errorText}><Icon name="alert" className="w-3.5 h-3.5" /> {fieldErrors.age}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Gender <span className="text-red-500">*</span></label>
                          <FieldSelect
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className={inputNormalClass}
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </FieldSelect>
                        </div>
                        <div>
                          <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => {
                              setFormData({ ...formData, phone: e.target.value });
                              if (touched.phone) setFieldErrors((p) => ({ ...p, phone: validateField('phone', e.target.value) }));
                            }}
                            onBlur={() => handleBlur('phone')}
                            readOnly={isAddingMember}
                            className={isAddingMember ? `${inputBaseClass} bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200` : touched.phone && fieldErrors.phone ? inputErrorClass : inputNormalClass}
                            placeholder="Phone number"
                          />
                          {isAddingMember && (
                            <p className="mt-1.5 text-xs text-sky-600 font-semibold flex items-center gap-1">
                              <Icon name="users" className="w-3.5 h-3.5" /> Inherited from family account
                            </p>
                          )}
                          {touched.phone && fieldErrors.phone && !isAddingMember && (
                            <p className={errorText}><Icon name="alert" className="w-3.5 h-3.5" /> {fieldErrors.phone}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Relation <span className="text-red-500">*</span></label>
                          <FieldSelect
                            value={formData.relation}
                            onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                            className={inputNormalClass}
                          >
                            {(isAddingMember ? ['Father', 'Mother', 'Son', 'Daughter', 'Wife', 'Husband', 'Other'] : RELATIONS).map((rel) => (
                              <option key={rel} value={rel}>{rel}</option>
                            ))}
                          </FieldSelect>
                          {isAddingMember && (
                            <p className="mt-1.5 text-xs text-sky-600 font-semibold">Relation to the family head</p>
                          )}
                        </div>
                        {!isAddingMember && (
                          <div>
                            <label className={labelClass}>Family ID <span className="text-slate-400 normal-case tracking-normal">(optional)</span></label>
                            <input
                              type="text"
                              value={formData.family_id || ''}
                              onChange={(e) => setFormData({ ...formData, family_id: e.target.value })}
                              className={inputNormalClass}
                              placeholder="Link to an existing family"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Visit details section */}
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
                      <span className="w-5 h-[2px] bg-teal-600" />
                      {isReturningPatient ? 'Visit Details' : 'Initial Visit Details'}
                    </h3>
                  </div>

                  <div>
                    <label className={labelClass}>Basic Symptoms</label>
                    <textarea
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      className={`${inputNormalClass} resize-none`}
                      rows={3}
                      placeholder="Describe symptoms for this visit..."
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Vitals <span className="text-slate-400 normal-case tracking-normal">(optional)</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="relative">
                        <Icon name="thermometer" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={formData.temperature}
                          onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                          className={`${inputNormalClass} pl-10`}
                          placeholder="98.6 °F"
                        />
                      </div>
                      <div className="relative">
                        <Icon name="droplet" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={formData.blood_pressure}
                          onChange={(e) => setFormData({ ...formData, blood_pressure: e.target.value })}
                          className={`${inputNormalClass} pl-10`}
                          placeholder="120/80"
                        />
                      </div>
                      <div className="relative">
                        <Icon name="activity" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={formData.heart_rate}
                          onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                          className={`${inputNormalClass} pl-10`}
                          placeholder="72 bpm"
                        />
                      </div>
                    </div>
                    <div className="mt-3 bg-teal-50 border-l-4 border-teal-500 px-4 py-3 text-xs text-teal-800 flex items-start gap-2">
                      <Icon name="alert" className="w-4 h-4 shrink-0 mt-0.5" />
                      Medical vitals are optional. You can also fill these during doctor consultation.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Assign Doctor <span className="text-red-500">*</span></label>
                      <FieldSelect
                        value={formData.doctor_id}
                        onChange={(e) => {
                          setFormData({ ...formData, doctor_id: e.target.value });
                          if (touched.doctor_id) setFieldErrors((p) => ({ ...p, doctor_id: validateField('doctor_id', e.target.value) }));
                        }}
                        onBlur={() => handleBlur('doctor_id')}
                        className={touched.doctor_id && fieldErrors.doctor_id ? inputErrorClass : inputNormalClass}
                      >
                        <option value="">Select a doctor</option>
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.user?.name} — {doc.specialization}
                            {doc.availability === 'busy' ? ' (Busy)' : ''}
                          </option>
                        ))}
                      </FieldSelect>
                      {touched.doctor_id && fieldErrors.doctor_id && (
                        <p className={errorText}><Icon name="alert" className="w-3.5 h-3.5" /> {fieldErrors.doctor_id}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Appointment Time</label>
                      <input
                        type="datetime-local"
                        value={formData.appointment_time}
                        onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                        className={inputNormalClass}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500 flex items-start gap-2">
                    <Icon name="zap" className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    Next appointment (follow-up) will be set by the doctor during consultation.
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={clearPhoneLookup}
                      className="px-6 py-3 border border-slate-300 text-slate-600 text-xs font-bold uppercase tracking-widest hover:border-red-400 hover:text-red-600 transition-colors"
                    >
                      Reset Form
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`w-full sm:w-auto px-8 py-3 text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm ${
                        isReturningPatient
                          ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/30'
                          : 'bg-teal-600 hover:bg-teal-700 hover:shadow-teal-600/30'
                      } hover:-translate-y-0.5`}
                    >
                      {submitting && <Spinner />}
                      <span>
                        {submitting
                          ? 'Submitting...'
                          : isReturningPatient
                            ? 'Create New Visit'
                            : isAddingMember
                              ? 'Add Family Member'
                              : 'Register Patient'
                        }
                      </span>
                      {!submitting && <Icon name="check" className="w-4 h-4" strokeWidth={3} />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════ PATIENT LIST TAB ══════════════ */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="bg-white border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative flex-1 sm:max-w-xs">
                    <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name or phone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={`${inputNormalClass} pl-10`}
                    />
                  </div>
                  <FieldSelect
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`${inputNormalClass} sm:w-52`}
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </FieldSelect>
                </div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  {patients.length} Patient{patients.length !== 1 ? 's' : ''}
                </div>
              </div>

              {patients.length === 0 ? (
                <EmptyState icon="users" title="No patients found" subtitle="Try adjusting your search or filters" />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block bg-white border border-slate-200 shadow-sm overflow-x-auto custom-scroll">
                    <table className="w-full min-w-[960px]">
                      <thead className="bg-slate-900">
                        <tr>
                          {['Patient', 'Age / Gender', 'Phone', 'Doctor', 'Relation', 'Status', 'Visits'].map((h) => (
                            <th key={h} className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">{h}</th>
                          ))}
                          <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Actions</th>
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
                            <td className="px-5 py-4 text-sm text-slate-600 capitalize">{patient.age} · {patient.gender}</td>
                            <td className="px-5 py-4 text-sm text-slate-600 font-medium">{patient.phone}</td>
                            <td className="px-5 py-4 text-sm text-slate-600">{patient.doctor?.user?.name || '—'}</td>
                            <td className="px-5 py-4">
                              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                                {patient.relation || 'Myself'}
                              </span>
                            </td>
                            <td className="px-5 py-4"><StatusBadge status={patient.status} /></td>
                            <td className="px-5 py-4">
                              <span className="font-display font-bold text-slate-900">{patient.consultations_count || 1}</span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => handleWhatsAppDirect(patient)}
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
                          <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</p><p className="text-slate-700 font-semibold mt-0.5">{patient.phone}</p></div>
                          <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Doctor</p><p className="text-slate-700 font-semibold mt-0.5">{patient.doctor?.user?.name || '—'}</p></div>
                          <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Relation</p><p className="text-slate-700 font-semibold mt-0.5">{patient.relation || 'Myself'}</p></div>
                          <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visits</p><p className="text-slate-700 font-semibold mt-0.5 font-display">{patient.consultations_count || 1}</p></div>
                        </div>
                        <button
                          onClick={() => handleWhatsAppDirect(patient)}
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

          {/* ══════════════ TODAY'S APPOINTMENTS TAB ══════════════ */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="bg-white border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Date</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className={`${inputNormalClass} w-auto`}
                  />
                  <button
                    onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
                    className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors"
                  >
                    Today
                  </button>
                </div>
                <button
                  onClick={fetchScheduledPatients}
                  className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-teal-400 hover:bg-slate-800 transition-colors"
                >
                  <Icon name="refresh" className="w-3.5 h-3.5" /> Refresh
                  <span className="text-slate-500 font-medium normal-case tracking-normal">· auto 30s</span>
                </button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total Scheduled', value: scheduledPatients.length, icon: 'calendar', iconCls: 'bg-teal-50 border-teal-200 text-teal-600', numCls: 'text-slate-900' },
                  { label: 'Pending', value: pendingCount, icon: 'clock', iconCls: 'bg-sky-50 border-sky-200 text-sky-600', numCls: 'text-sky-600' },
                  { label: 'Completed', value: completedCount, icon: 'check', iconCls: 'bg-emerald-50 border-emerald-200 text-emerald-600', numCls: 'text-emerald-600' },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 border flex items-center justify-center shrink-0 ${s.iconCls}`}>
                      <Icon name={s.icon} className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{s.label}</p>
                      <p className={`font-display text-3xl font-bold mt-1 ${s.numCls}`}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Patient cards */}
              {scheduledPatients.length === 0 ? (
                <EmptyState icon="calendar" title="No patients scheduled for this date" subtitle="Pick another date or register a new patient" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {scheduledPatients.map((patient) => (
                    <div key={patient.id} className="bg-white border border-slate-200 shadow-sm transition-all duration-200 hover:border-teal-500 hover:shadow-lg hover:-translate-y-0.5 flex flex-col overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-teal-600 via-teal-500 to-sky-500" />
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-3 mb-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 bg-slate-900 text-teal-400 flex items-center justify-center font-display font-bold shrink-0">
                              {initials(patient.name)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-slate-900 truncate">{patient.name}</h3>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{patient.phone}</p>
                            </div>
                          </div>
                          <StatusBadge status={patient.status} />
                        </div>

                        <div className="space-y-2 flex-grow">
                          <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                              <Icon name="clock" className="w-3.5 h-3.5" /> Appointment
                            </span>
                            <span className="font-display font-bold text-slate-900 text-sm">
                              {patient.consultation?.appointment_time
                                ? new Date(patient.consultation.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between px-3 py-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                              <Icon name="user" className="w-3.5 h-3.5" /> Doctor
                            </span>
                            <span className="text-sm font-bold text-slate-800">{patient.doctor?.user?.name || '—'}</span>
                          </div>
                          {patient.consultation?.symptoms && (
                            <div className="pt-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Symptoms</p>
                              <p className="text-xs text-slate-600 bg-slate-50 border-l-2 border-teal-500 p-2.5 leading-relaxed">{patient.consultation.symptoms}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-5">
                          <button
                            onClick={() => handleWhatsAppEnquiry(patient)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-all duration-200 shadow-sm"
                          >
                            <Icon name="message" className="w-3.5 h-3.5" /> WhatsApp
                          </button>
                          {patient.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusChange(patient.id, 'completed')}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-300 text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:border-emerald-600 hover:text-emerald-700 transition-all duration-200"
                            >
                              <Icon name="check" className="w-3.5 h-3.5" /> Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ NEXT APPOINTMENTS TAB ══════════════ */}
          {activeTab === 'next' && (
            <div className="space-y-4">
              <div className="bg-teal-50 border-l-4 border-teal-600 px-5 py-4 text-sm text-teal-900 flex items-start gap-3 shadow-sm">
                <Icon name="zap" className="w-5 h-5 shrink-0 mt-0.5 text-teal-600" />
                <p className="font-medium">
                  These are follow-up appointments set by doctors during consultation. Only doctor-assigned follow-ups appear here.
                </p>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Filter by Date</label>
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

              {loadingNext ? (
                <div className="bg-white border border-slate-200 shadow-sm px-6 py-16 text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-slate-500 font-semibold text-sm uppercase tracking-wider">Loading follow-ups...</p>
                </div>
              ) : nextAppointments.length === 0 ? (
                <EmptyState
                  icon="zap"
                  title={nextApptDate ? `No follow-ups scheduled for ${new Date(nextApptDate + 'T00:00:00').toLocaleDateString()}` : 'No follow-up appointments scheduled yet'}
                  subtitle="Follow-ups are set by doctors during consultation"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {nextAppointments.map((patient) => (
                    <div key={patient.id} className="bg-white border border-slate-200 shadow-sm transition-all duration-200 hover:border-teal-500 hover:shadow-lg hover:-translate-y-0.5 flex flex-col overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-teal-600 via-sky-500 to-teal-600" />
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-3 mb-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 bg-slate-900 text-teal-400 flex items-center justify-center font-display font-bold shrink-0">
                              {initials(patient.name)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-slate-900 truncate">{patient.name}</h3>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{patient.phone}</p>
                            </div>
                          </div>
                          <StatusBadge status={patient.status} />
                        </div>

                        <div className="space-y-2 flex-grow">
                          <div className="flex items-center justify-between bg-teal-50 border border-teal-100 px-3 py-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 flex items-center gap-1.5">
                              <Icon name="zap" className="w-3.5 h-3.5" /> Follow-up
                            </span>
                            <span className="font-display font-bold text-teal-700 text-sm">
                              {patient.consultation?.next_appointment
                                ? new Date(patient.consultation.next_appointment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between px-3 py-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                              <Icon name="user" className="w-3.5 h-3.5" /> Doctor
                            </span>
                            <span className="text-sm font-bold text-slate-800">{patient.doctor?.user?.name || '—'}</span>
                          </div>
                          {patient.consultation?.diagnosis && (
                            <div className="pt-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Last Diagnosis</p>
                              <p className="text-xs text-slate-600 bg-slate-50 border-l-2 border-teal-500 p-2.5 leading-relaxed">{patient.consultation.diagnosis}</p>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleWhatsAppEnquiry(patient)}
                          className="mt-5 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-all duration-200 shadow-sm"
                        >
                          <Icon name="message" className="w-3.5 h-3.5" /> Send WhatsApp
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}