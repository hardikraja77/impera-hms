import { useState, useEffect, useRef, useCallback } from 'react';
import api, { getErrorMessage } from '../../api';
import Sidebar from '../../components/Sidebar';
import Spinner from '../../components/Spinner';
import { useEchoChannel } from '../../hooks/useEcho';
import { useAuth } from '../../context/AuthContext';

const RELATIONS = ['Myself', 'Father', 'Mother', 'Son', 'Daughter', 'Wife', 'Husband', 'Other'];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', dot: '🟡' },
  enquired: { label: 'Enquired', color: 'bg-blue-100 text-blue-800', dot: '🔵' },
  assigned: { label: 'Assigned', color: 'bg-purple-100 text-purple-800', dot: '🟣' },
  consulted: { label: 'Consulted', color: 'bg-orange-100 text-orange-800', dot: '🟠' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', dot: '🟢' },
};

const POLL_INTERVAL = 30000; // 30 seconds auto-refresh

export default function ReceptionistDashboard() {
  const [activeTab, setActiveTab] = useState('add');
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [scheduledPatients, setScheduledPatients] = useState([]);
  const [nextAppointments, setNextAppointments] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Smart phone detection
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneLookup, setPhoneLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [visitHistory, setVisitHistory] = useState([]);
  const lookupTimer = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    phone: '',
    symptoms: '',
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

  // Cache for phone lookups
  const phoneCache = useRef({});
  // Polling
  const pollRef = useRef(null);

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
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      const res = await api.get(`/receptionist/scheduled-patients?${params.toString()}`);
      setScheduledPatients(res.data || []);
    } catch (err) {
      console.error('[Receptionist] Failed to fetch scheduled patients:', getErrorMessage(err));
    }
  }, [dateFilter]);

  const fetchNextAppointments = useCallback(async () => {
    try {
      const res = await api.get('/receptionist/next-appointments');
      setNextAppointments(res.data || []);
    } catch (err) {
      console.error('[Receptionist] Failed to fetch next appointments:', getErrorMessage(err));
    }
  }, []);

  // Auto-refresh polling (fallback for when Echo is not connected)
  useEffect(() => {
    const refresh = () => {
      if (activeTab === 'schedule') fetchScheduledPatients();
      if (activeTab === 'next') fetchNextAppointments();
      if (activeTab === 'list') fetchPatients();
    };

    refresh(); // initial fetch
    pollRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [activeTab, fetchScheduledPatients, fetchNextAppointments, fetchPatients]);

  // ── Real-time Echo subscriptions ──
  const { user } = useAuth();

  useEchoChannel(
    `receptionist.${user?.id}`,
    '.patient.status.updated',
    useCallback((e) => {
      console.log('[Echo] Patient status updated:', e);
      // Refresh the relevant data based on what changed
      if (activeTab === 'schedule') fetchScheduledPatients();
      if (activeTab === 'list') fetchPatients();
      if (activeTab === 'next') fetchNextAppointments();
      setSuccess(`🔄 ${e.message}`);
      setTimeout(() => setSuccess(''), 3000);
    }, [activeTab, fetchScheduledPatients, fetchPatients, fetchNextAppointments])
  );

  useEchoChannel(
    `receptionist.${user?.id}`,
    '.consultation.updated',
    useCallback((e) => {
      console.log('[Echo] Consultation updated:', e);
      // Doctor completed or updated consultation — refresh all views
      if (activeTab === 'schedule') fetchScheduledPatients();
      if (activeTab === 'list') fetchPatients();
      if (activeTab === 'next') fetchNextAppointments();
      setSuccess(`🔄 ${e.message}`);
      setTimeout(() => setSuccess(''), 3000);
    }, [activeTab, fetchScheduledPatients, fetchPatients, fetchNextAppointments])
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
      setVisitHistory(data.visit_history || []);
      setFormData((prev) => ({
        ...prev,
        name: data.patient.name,
        age: data.patient.age,
        gender: data.patient.gender,
        phone: data.patient.phone,
        family_id: data.patient.family_id || data.patient.id,
      }));
    } else {
      setSelectedPatient(null);
      setFamilyMembers([]);
      setVisitHistory([]);
      setFormData((prev) => ({ ...prev, phone: phoneInput.trim() }));
    }
  };

  const selectFamilyMember = (member) => {
    setSelectedPatient(member);
    setFormData((prev) => ({
      ...prev,
      name: member.name,
      age: member.age,
      gender: member.gender,
      phone: member.phone,
      family_id: member.family_id || member.id,
    }));
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
      const payload = {
        ...formData,
        family_id: formData.family_id || null,
        relation: formData.relation || 'Myself',
        appointment_time: formData.appointment_time || null,
      };
      await api.post('/receptionist/patients', payload);
      setSuccess('Patient registered and assigned to doctor successfully!');

      // Clear form but keep phone for quick next entry
      const phone = formData.phone;
      setFormData({
        name: '',
        age: '',
        gender: 'male',
        phone,
        symptoms: '',
        doctor_id: '',
        relation: 'Myself',
        family_id: '',
        appointment_time: '',
      });
      setFieldErrors({});
      setTouched({});
      setSelectedPatient(null);
      setFamilyMembers([]);
      setVisitHistory([]);
      setPhoneLookup(null);
      setPhoneInput('');

      // Refresh lists
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
    { id: 'add', label: 'Add Patient', icon: '➕', active: activeTab === 'add', onClick: () => setActiveTab('add') },
    { id: 'list', label: 'Patient List', icon: '📋', active: activeTab === 'list', onClick: () => setActiveTab('list') },
    { id: 'schedule', label: 'Today\'s Appointments', icon: '📅', active: activeTab === 'schedule', onClick: () => setActiveTab('schedule') },
    { id: 'next', label: 'Next Appointments', icon: '🔮', active: activeTab === 'next', onClick: () => setActiveTab('next'), badge: nextAppointments.length },
  ];

  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.dot} {config.label}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar navItems={navItems} />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {activeTab === 'add' && '➕ Add New Patient'}
          {activeTab === 'list' && '📋 Patient List'}
          {activeTab === 'schedule' && '📅 Today\'s Appointments'}
          {activeTab === 'next' && '🔮 Doctor-Assigned Follow-ups'}
        </h1>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center space-x-2">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        {errors._general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center space-x-2">
            <span>⚠️</span>
            <span>{errors._general}</span>
          </div>
        )}

        {/* ── Add Patient Tab ── */}
        {activeTab === 'add' && (
          <div className="max-w-3xl space-y-6">
            {/* Smart Phone Detection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📱 Enter Phone Number <span className="text-xs text-gray-400">(auto-detects existing patient)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number to search..."
                />
                {lookupLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner />
                  </div>
                )}
              </div>

              {phoneLookup && !lookupLoading && (
                <div className="mt-4">
                  {phoneLookup.exists ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-blue-800">
                          ✅ Existing patient found: <span className="font-bold">{selectedPatient?.name}</span>
                        </p>
                        <button
                          onClick={() => {
                            setPhoneLookup(null);
                            setSelectedPatient(null);
                            setFamilyMembers([]);
                            setVisitHistory([]);
                            setPhoneInput('');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          ✕ Clear
                        </button>
                      </div>

                      {familyMembers.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            👨‍👩‍👧 Select Family Member:
                          </label>
                          <select
                            value={selectedPatient?.id || ''}
                            onChange={(e) => {
                              const member = familyMembers.find((m) => m.id === Number(e.target.value));
                              if (member) selectFamilyMember(member);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {familyMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} ({member.relation || 'Myself'}) - {member.age} yrs
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {familyMembers.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                          {familyMembers.map((member) => (
                            <button
                              key={member.id}
                              onClick={() => selectFamilyMember(member)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                selectedPatient?.id === member.id
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                  : 'border-gray-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.relation || 'Myself'} • {member.age} yrs</p>
                              <p className="text-xs text-gray-400 mt-1">{member.phone}</p>
                            </button>
                          ))}
                        </div>
                      )}

                      {visitHistory.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-600 mb-2">📋 Previous Visits:</p>
                          <div className="space-y-2">
                            {visitHistory.slice(0, 3).map((visit) => (
                              <div key={visit.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                                <div>
                                  <p className="text-xs font-medium text-gray-800">{visit.doctor?.user?.name || 'Doctor'}</p>
                                  <p className="text-xs text-gray-500">{visit.symptoms || 'No symptoms recorded'}</p>
                                </div>
                                <div className="text-right">
                                  <StatusBadge status={visit.status} />
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(visit.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        🆕 New patient — please fill the registration form below
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {phoneLookup?.exists ? '👨‍👩‍👧 Add Family Member / New Visit' : '🆕 New Patient Registration'}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (touched.name) setFieldErrors((p) => ({ ...p, name: validateField('name', e.target.value) }));
                    }}
                    onBlur={() => handleBlur('name')}
                    className={`w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${touched.name && fieldErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Enter full name"
                  />
                  {touched.name && fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                      <span>•</span><span>{fieldErrors.name}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => {
                      setFormData({ ...formData, age: e.target.value });
                      if (touched.age) setFieldErrors((p) => ({ ...p, age: validateField('age', e.target.value) }));
                    }}
                    onBlur={() => handleBlur('age')}
                    className={`w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${touched.age && fieldErrors.age ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Age"
                    min="1"
                    max="150"
                  />
                  {touched.age && fieldErrors.age && (
                    <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                      <span>•</span><span>{fieldErrors.age}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (touched.phone) setFieldErrors((p) => ({ ...p, phone: validateField('phone', e.target.value) }));
                    }}
                    onBlur={() => handleBlur('phone')}
                    className={`w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${touched.phone && fieldErrors.phone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Phone number"
                  />
                  {touched.phone && fieldErrors.phone && (
                    <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                      <span>•</span><span>{fieldErrors.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                  <select
                    value={formData.relation}
                    onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {RELATIONS.map((rel) => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Time</label>
                  <input
                    type="datetime-local"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Basic Symptoms</label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe symptoms..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Doctor *</label>
                <select
                  value={formData.doctor_id}
                  onChange={(e) => {
                    setFormData({ ...formData, doctor_id: e.target.value });
                    if (touched.doctor_id) setFieldErrors((p) => ({ ...p, doctor_id: validateField('doctor_id', e.target.value) }));
                  }}
                  onBlur={() => handleBlur('doctor_id')}
                  className={`w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${touched.doctor_id && fieldErrors.doctor_id ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                >
                  <option value="">Select a doctor</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.user?.name} - {doc.specialization}
                    </option>
                  ))}
                </select>
                {touched.doctor_id && fieldErrors.doctor_id && (
                  <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                    <span>•</span><span>{fieldErrors.doctor_id}</span>
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                ℹ️ Next appointment will be set by the doctor during consultation (optional). You can only schedule the initial appointment here.
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {submitting && <Spinner />}
                  <span>{submitting ? 'Submitting...' : 'Submit Patient'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Patient List Tab ── */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age/Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{patient.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{patient.age} / {patient.gender}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{patient.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{patient.doctor?.user?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={patient.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(patient.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {patients.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No patients found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Scheduled Patients Tab ── */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">📅 Date:</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
                  className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Today
                </button>
              </div>
              <button
                onClick={fetchScheduledPatients}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                🔄 Refresh
                <span className="text-xs text-gray-400">(auto: 30s)</span>
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Total Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{scheduledPatients.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {scheduledPatients.filter((p) => p.status === 'pending' || p.status === 'assigned').length}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {scheduledPatients.filter((p) => p.status === 'completed').length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduledPatients.map((patient) => (
                <div key={patient.id} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                      <p className="text-sm text-gray-500">{patient.phone}</p>
                    </div>
                    <StatusBadge status={patient.status} />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">🕐 Appointment</span>
                      <span className="font-medium text-gray-800">
                        {patient.appointment_time
                          ? new Date(patient.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">👨‍⚕️ Doctor</span>
                      <span className="font-medium text-gray-800">{patient.doctor?.user?.name || '-'}</span>
                    </div>
                    {patient.symptoms && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Symptoms:</p>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">{patient.symptoms}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleWhatsAppEnquiry(patient)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      <span>💬</span> WhatsApp
                    </button>
                    {patient.status !== 'completed' && (
                      <button
                        onClick={() => handleStatusChange(patient.id, 'completed')}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        ✅ Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {scheduledPatients.length === 0 && (
                <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center">
                  <p className="text-4xl mb-3">📅</p>
                  <p className="text-gray-500">No patients scheduled for this date</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Next Appointments Tab (Doctor-assigned follow-ups) ── */}
        {activeTab === 'next' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mb-4">
              ℹ️ These are follow-up appointments set by doctors during consultation. Only doctor-assigned follow-ups appear here.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nextAppointments.map((patient) => (
                <div key={patient.id} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                      <p className="text-sm text-gray-500">{patient.phone}</p>
                    </div>
                    <StatusBadge status={patient.status} />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">📅 Follow-up Date</span>
                      <span className="font-medium text-purple-700">
                        {patient.consultation?.next_appointment
                          ? new Date(patient.consultation.next_appointment).toLocaleDateString()
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">👨‍⚕️ Doctor</span>
                      <span className="font-medium text-gray-800">{patient.doctor?.user?.name || '-'}</span>
                    </div>
                    {patient.consultation?.diagnosis && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Last Diagnosis:</p>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">{patient.consultation.diagnosis}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleWhatsAppEnquiry(patient)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      <span>💬</span> WhatsApp
                    </button>
                  </div>
                </div>
              ))}

              {nextAppointments.length === 0 && (
                <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center">
                  <p className="text-4xl mb-3">🔮</p>
                  <p className="text-gray-500">No follow-up appointments scheduled yet</p>
                  <p className="text-xs text-gray-400 mt-2">Follow-ups are set by doctors during consultation</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
