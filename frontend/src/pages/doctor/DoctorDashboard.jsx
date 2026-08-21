import { useState, useEffect, useCallback, useRef } from 'react';
import api, { getErrorMessage } from '../../api';
import Sidebar from '../../components/Sidebar';
import Spinner from '../../components/Spinner';
import { useEchoChannel } from '../../hooks/useEcho';
import { useAuth } from '../../context/AuthContext';

const POLL_INTERVAL = 30000; // 30 seconds

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState('enquiries');
  const [enquiries, setEnquiries] = useState([]);
  const [consulted, setConsulted] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultationForm, setConsultationForm] = useState({
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
    next_appointment: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const pollRef = useRef(null);

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
        const res = await api.get('/doctor/today-followups');
        setFollowups(res.data);
      }
    } catch (err) {
      console.error('[Doctor] Fetch failed:', getErrorMessage(err));
    }
  }, [activeTab]);

  // Auto-refresh polling (fallback)
  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchData]);

  // ── Real-time Echo subscriptions ──
  const { user } = useAuth();
  const doctorId = user?.doctor?.id;

  useEchoChannel(
    `doctor.${doctorId}`,
    '.patient.created',
    useCallback((e) => {
      console.log('[Echo] New patient assigned:', e);
      fetchData();
      showMsg('success', `📩 ${e.message}`);
    }, [fetchData])
  );

  useEchoChannel(
    `doctor.${doctorId}`,
    '.patient.status.updated',
    useCallback((e) => {
      console.log('[Echo] Patient status updated:', e);
      fetchData();
    }, [fetchData])
  );

  useEchoChannel(
    `doctor.${doctorId}`,
    '.consultation.updated',
    useCallback((e) => {
      console.log('[Echo] Consultation updated:', e);
      fetchData();
    }, [fetchData])
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

  const sendWhatsAppReminder = async (patientId) => {
    try {
      const res = await api.post(`/doctor/whatsapp-reminder/${patientId}`);
      window.open(res.data.whatsapp_url, '_blank');
      fetchData();
    } catch (err) {
      showMsg('error', getErrorMessage(err));
    }
  };

  const navItems = [
    { id: 'enquiries', label: 'New Enquiries', icon: '📩', active: activeTab === 'enquiries', onClick: () => setActiveTab('enquiries'), badge: enquiries.length },
    { id: 'consulted', label: 'In Consultation', icon: '🩺', active: activeTab === 'consulted', onClick: () => setActiveTab('consulted') },
    { id: 'completed', label: 'Completed', icon: '✅', active: activeTab === 'completed', onClick: () => setActiveTab('completed') },
    { id: 'followups', label: "Today's Follow-ups", icon: '📅', active: activeTab === 'followups', onClick: () => setActiveTab('followups'), badge: followups.length },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar navItems={navItems} />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {activeTab === 'enquiries' && '📩 New Enquiries'}
          {activeTab === 'consulted' && '🩺 Patients In Consultation'}
          {activeTab === 'completed' && '✅ Completed Cases'}
          {activeTab === 'followups' && "📅 Today's Follow-ups"}
        </h1>

        {msg.text && (
          <div className={`px-4 py-3 rounded-lg mb-4 text-sm flex items-center space-x-2 ${
            msg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <span>{msg.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{msg.text}</span>
          </div>
        )}

        {/* ── New Enquiries ── */}
        {activeTab === 'enquiries' && (
          <div className="space-y-4">
            {enquiries.length === 0 ? (
              <EmptyState icon="📭" message="No new enquiries" />
            ) : (
              enquiries.map((patient) => (
                <div key={patient.id} className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                      <p className="text-sm text-gray-500">{patient.age} yrs • {patient.gender} • {patient.phone}</p>
                      {patient.symptoms && <p className="text-sm text-gray-600 mt-1">Symptoms: {patient.symptoms}</p>}
                      <p className="text-xs text-gray-400 mt-1">Assigned by: {patient.creator?.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startConsultation(patient.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Start Consultation
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── In Consultation ── */}
        {activeTab === 'consulted' && (
          <div className="space-y-4">
            {consulted.length === 0 ? (
              <EmptyState icon="🩺" message="No patients in consultation" />
            ) : (
              consulted.map((patient) => (
                <div key={patient.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                        <p className="text-sm text-gray-500">{patient.age} yrs • {patient.gender} • {patient.phone}</p>
                        {patient.symptoms && <p className="text-sm text-gray-600 mt-1">Symptoms: {patient.symptoms}</p>}
                        {patient.consultation?.diagnosis && (
                          <p className="text-xs text-blue-600 mt-1">📝 Diagnosis in progress</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openConsultation(patient)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
                    >
                      📝 Open Consultation
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Completed Cases ── */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            {completed.length === 0 ? (
              <EmptyState icon="✅" message="No completed cases" />
            ) : (
              completed.map((patient) => (
                <div key={patient.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                        <p className="text-sm text-gray-500">{patient.age} yrs • {patient.gender} • {patient.phone}</p>
                        {patient.consultation?.diagnosis && (
                          <p className="text-sm text-gray-600 mt-1">Diagnosis: {patient.consultation.diagnosis}</p>
                        )}
                        {patient.consultation?.next_appointment && (
                          <p className="text-xs text-purple-600 mt-1">
                            📅 Follow-up: {new Date(patient.consultation.next_appointment).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">✅ Completed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Today's Follow-ups ── */}
        {activeTab === 'followups' && (
          <div className="space-y-4">
            {followups.length === 0 ? (
              <EmptyState icon="📅" message="No follow-ups scheduled for today" />
            ) : (
              followups.map((patient) => (
                <div key={patient.id} className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                      <p className="text-sm text-gray-500">{patient.age} yrs • {patient.phone}</p>
                      {patient.consultation?.next_appointment && (
                        <p className="text-xs text-purple-600 mt-1">
                          📅 Follow-up: {new Date(patient.consultation.next_appointment).toLocaleDateString()}
                        </p>
                      )}
                      {patient.consultation?.diagnosis && (
                        <p className="text-xs text-gray-500 mt-1">Last diagnosis: {patient.consultation.diagnosis}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openConsultation(patient)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
                    >
                      📝 Consult
                    </button>
                    <button
                      onClick={() => sendWhatsAppReminder(patient.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                    >
                      <span>📱</span>
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Consultation Modal ── */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Consultation — {selectedPatient.name}
                </h3>
                <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                  <textarea
                    value={consultationForm.diagnosis}
                    onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter diagnosis..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Treatment</label>
                  <textarea
                    value={consultationForm.treatment}
                    onChange={(e) => setConsultationForm({ ...consultationForm, treatment: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter treatment plan..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prescription</label>
                  <textarea
                    value={consultationForm.prescription}
                    onChange={(e) => setConsultationForm({ ...consultationForm, prescription: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter prescription..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={consultationForm.notes}
                    onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📅 Next Appointment
                    <span className="text-xs text-gray-400 font-normal ml-2">(Optional — leave empty if no follow-up needed)</span>
                  </label>
                  <input
                    type="date"
                    value={consultationForm.next_appointment}
                    onChange={(e) => setConsultationForm({ ...consultationForm, next_appointment: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {consultationForm.next_appointment && (
                    <p className="mt-1 text-xs text-purple-600">
                      ✅ Follow-up appointment will be scheduled for {new Date(consultationForm.next_appointment).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedPatient(null)}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveConsultation}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center space-x-2"
                >
                  {saving && <Spinner />}
                  <span>{saving ? 'Saving...' : 'Save Progress'}</span>
                </button>
                <button
                  onClick={completeConsultation}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-60 flex items-center space-x-2"
                >
                  {saving && <Spinner />}
                  <span>{saving ? 'Saving...' : 'Complete & Save'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
