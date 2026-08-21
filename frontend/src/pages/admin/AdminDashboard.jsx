import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../../api';
import Sidebar from '../../components/Sidebar';
import Spinner from '../../components/Spinner';
import { useEchoChannel } from '../../hooks/useEcho';

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

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'doctors') fetchDoctors();
    if (activeTab === 'receptionists') fetchReceptionists();
    if (activeTab === 'patients') fetchPatients();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'patients') fetchPatients();
  }, [search, filterStatus, filterDoctor, filterDate]);

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
  }, [fromDate, toDate, analyticsDoctor, analyticsDept]);

  // ── Real-time Echo subscriptions for admin dashboard ──
  useEchoChannel(
    'admin.dashboard',
    '.patient.created',
    useCallback((e) => {
      console.log('[Echo] Admin: New patient created:', e);
      // Refresh whatever tab is active
      if (activeTab === 'analytics') fetchAnalytics();
      if (activeTab === 'patients') fetchPatients();
    }, [activeTab, fetchAnalytics, fetchPatients])
  );

  useEchoChannel(
    'admin.dashboard',
    '.patient.status.updated',
    useCallback((e) => {
      console.log('[Echo] Admin: Patient status updated:', e);
      if (activeTab === 'analytics') fetchAnalytics();
      if (activeTab === 'patients') fetchPatients();
    }, [activeTab, fetchAnalytics, fetchPatients])
  );

  useEchoChannel(
    'admin.dashboard',
    '.consultation.updated',
    useCallback((e) => {
      console.log('[Echo] Admin: Consultation updated:', e);
      if (activeTab === 'analytics') fetchAnalytics();
      if (activeTab === 'patients') fetchPatients();
    }, [activeTab, fetchAnalytics, fetchPatients])
  );

  const fetchAnalytics = async () => {
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
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/admin/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error('[Admin] Doctors fetch failed:', getErrorMessage(err));
    }
  };

  const fetchReceptionists = async () => {
    try {
      const res = await api.get('/admin/receptionists');
      setReceptionists(res.data);
    } catch (err) {
      console.error('[Admin] Receptionists fetch failed:', getErrorMessage(err));
    }
  };

  const fetchPatients = async () => {
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
    }
  };

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
        name: '', email: '', phone: '', specialization: '',
        consultation_fee: 0, available_days: ['Mon','Tue','Wed','Thu','Fri'],
        available_from: '09:00', available_to: '17:00',
      });
    } else if (type === 'receptionist') {
      setFormData(item ? {
        name: item.name || '', email: item.email || '', phone: item.phone || '',
      } : { name: '', email: '', phone: '', password: '' });
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
    if (!editItem && modalType === 'receptionist' && formData.password && formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
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

  const navItems = [
    { id: 'analytics', label: 'Analytics', icon: '📊', active: activeTab === 'analytics', onClick: () => setActiveTab('analytics') },
    { id: 'doctors', label: 'Doctors', icon: '👨‍⚕️', active: activeTab === 'doctors', onClick: () => setActiveTab('doctors'), badge: doctors.length },
    { id: 'receptionists', label: 'Receptionists', icon: '🧑‍💼', active: activeTab === 'receptionists', onClick: () => setActiveTab('receptionists'), badge: receptionists.length },
    { id: 'patients', label: 'All Patients', icon: '👥', active: activeTab === 'patients', onClick: () => setActiveTab('patients') },
  ];

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    enquired: 'bg-blue-100 text-blue-800',
    assigned: 'bg-purple-100 text-purple-800',
    consulted: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar navItems={navItems} />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {activeTab === 'analytics' && '📊 Analytics Dashboard'}
          {activeTab === 'doctors' && '👨‍⚕️ Manage Doctors'}
          {activeTab === 'receptionists' && '🧑‍💼 Manage Receptionists'}
          {activeTab === 'patients' && '👥 All Patients'}
        </h1>

        {/* ── Analytics Tab ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Date Range & Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Doctor</label>
                  <select
                    value={analyticsDoctor}
                    onChange={(e) => setAnalyticsDoctor(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Doctors</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.user?.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                  <select
                    value={analyticsDept}
                    onChange={(e) => setAnalyticsDept(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Departments</option>
                    {analytics?.departments?.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
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
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  Reset
                </button>
              </div>
            </div>

            {analytics ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Total Patients" value={analytics.total_patients} color="blue" />
                  <StatCard title={`Patients (${analytics.filters?.from_date} to ${analytics.filters?.to_date})`} value={analytics.range_patients} color="indigo" />
                  <StatCard title="Today's Patients" value={analytics.today_patients} color="emerald" />
                  <StatCard title="Active Doctors" value={analytics.active_doctors} color="purple" />
                </div>

                {/* Revenue */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard title="Total Revenue (Range)" value={`₹${Number(analytics.total_revenue || 0).toLocaleString()}`} color="green" />
                  <StatCard title="Today's Revenue" value={`₹${Number(analytics.today_revenue || 0).toLocaleString()}`} color="emerald" />
                  <StatCard title="Monthly Revenue" value={`₹${Number(analytics.monthly_revenue || 0).toLocaleString()}`} color="teal" />
                </div>

                {/* Status Overview */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  <StatCard title="Pending" value={analytics.assigned_patients} color="yellow" />
                  <StatCard title="In Consultation" value={analytics.consulted_patients} color="orange" />
                  <StatCard title="Completed" value={analytics.completed_patients} color="green" />
                  <StatCard title="Receptionists" value={analytics.total_receptionists} color="gray" />
                  <StatCard title="Total Doctors" value={analytics.total_doctors} color="blue" />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Doctor-wise Patient Count */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">👨‍⚕️ Patients per Doctor</h3>
                    <div className="space-y-3">
                      {analytics.doctor_wise_count?.length > 0 ? (
                        analytics.doctor_wise_count.map((item) => {
                          const maxCount = Math.max(...analytics.doctor_wise_count.map(d => d.total));
                          return (
                            <div key={item.doctor_id} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700 w-32 truncate">{item.doctor?.user?.name || 'Unknown'}</span>
                              <div className="flex items-center space-x-3 flex-1 ml-4">
                                <div className="w-48 bg-gray-100 rounded-full h-3">
                                  <div
                                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${maxCount > 0 ? (item.total / maxCount) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-900 w-8 text-right">{item.total}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500">No data yet</p>
                      )}
                    </div>
                  </div>

                  {/* Doctor Revenue */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">💰 Revenue per Doctor</h3>
                    <div className="space-y-3">
                      {analytics.doctor_revenue?.length > 0 ? (
                        analytics.doctor_revenue.map((item) => {
                          const maxRev = Math.max(...analytics.doctor_revenue.map(d => d.revenue));
                          return (
                            <div key={item.doctor_id} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700 w-32 truncate">{item.name}</span>
                              <div className="flex items-center space-x-3 flex-1 ml-4">
                                <div className="w-48 bg-gray-100 rounded-full h-3">
                                  <div
                                    className="bg-green-600 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${maxRev > 0 ? (item.revenue / maxRev) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-900 w-20 text-right">₹{item.revenue.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500">No revenue data</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Daily Stats & Status Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Patient Trend */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">📈 Daily Patient Trend</h3>
                    {analytics.daily_stats?.length > 0 ? (
                      <div className="flex items-end gap-1 h-40">
                        {analytics.daily_stats.map((day) => {
                          const maxDay = Math.max(...analytics.daily_stats.map(d => d.total));
                          return (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                              <div
                                className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                                style={{ height: `${maxDay > 0 ? (day.total / maxDay) * 100 : 0}%`, minHeight: '4px' }}
                              />
                              <span className="text-[10px] text-gray-400 hidden sm:inline">
                                {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                              </span>
                              <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap">
                                {day.date}: {day.total} patients
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No daily data</p>
                    )}
                  </div>

                  {/* Appointment Status Distribution */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">📊 Appointment Status Distribution</h3>
                    {analytics.status_distribution?.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.status_distribution.map((item) => {
                          const total = analytics.status_distribution.reduce((sum, s) => sum + s.count, 0);
                          const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
                          const barColors = {
                            pending: 'bg-yellow-500',
                            enquired: 'bg-blue-500',
                            assigned: 'bg-purple-500',
                            consulted: 'bg-orange-500',
                            completed: 'bg-green-500',
                          };
                          return (
                            <div key={item.status} className="flex items-center space-x-3">
                              <span className="text-sm text-gray-700 w-24 capitalize">{item.status}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-4">
                                <div
                                  className={`${barColors[item.status] || 'bg-gray-500'} h-4 rounded-full transition-all duration-500`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-16 text-right">{item.count} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No status data</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-500">Loading analytics...</p>
              </div>
            )}
          </div>
        )}

        {/* ── Doctors Tab ── */}
        {activeTab === 'doctors' && (
          <div className="space-y-4">
            <button
              onClick={() => openModal('doctor')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              + Add Doctor
            </button>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.user?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{doc.user?.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{doc.specialization}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">₹{doc.consultation_fee}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${doc.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {doc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => openModal('doctor', doc)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                        <button onClick={() => handleDelete('doctor', doc.id)} disabled={deletingId === doc.id} className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50">
                          {deletingId === doc.id ? <Spinner size="sm" /> : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Receptionists Tab ── */}
        {activeTab === 'receptionists' && (
          <div className="space-y-4">
            <button
              onClick={() => openModal('receptionist')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              + Add Receptionist
            </button>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {receptionists.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{rec.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{rec.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{rec.phone || '-'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => openModal('receptionist', rec)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                        <button onClick={() => handleDelete('receptionist', rec.id)} disabled={deletingId === rec.id} className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50">
                          {deletingId === rec.id ? <Spinner size="sm" /> : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Patients Tab ── */}
        {activeTab === 'patients' && (
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
                <option value="assigned">Assigned</option>
                <option value="consulted">Consulted</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.user?.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
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
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[patient.status] || ''}`}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(patient.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Modal ── */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold mb-4">
                {editItem ? 'Edit' : 'Add'} {modalType === 'doctor' ? 'Doctor' : 'Receptionist'}
              </h3>
              {modalErrors._general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {modalErrors._general}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.name || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (modalErrors.name) setModalErrors((p) => ({ ...p, name: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${modalErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                  />
                  {modalErrors.name && <p className="mt-1 text-xs text-red-600">• {modalErrors.name}</p>}
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (modalErrors.email) setModalErrors((p) => ({ ...p, email: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${modalErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                  />
                  {modalErrors.email && <p className="mt-1 text-xs text-red-600">• {modalErrors.email}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {modalType === 'doctor' && (
                  <>
                    <div>
                      <input
                        type="text"
                        placeholder="Specialization"
                        value={formData.specialization || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, specialization: e.target.value });
                          if (modalErrors.specialization) setModalErrors((p) => ({ ...p, specialization: '' }));
                        }}
                        className={`w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${modalErrors.specialization ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                      />
                      {modalErrors.specialization && <p className="mt-1 text-xs text-red-600">• {modalErrors.specialization}</p>}
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Consultation Fee"
                        value={formData.consultation_fee || ''}
                        onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="time"
                        value={formData.available_from || '09:00'}
                        onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="time"
                        value={formData.available_to || '17:00'}
                        onChange={(e) => setFormData({ ...formData, available_to: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
                {!editItem && modalType === 'receptionist' && (
                  <div>
                    <input
                      type="password"
                      placeholder="Password (default: password)"
                      value={formData.password || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (modalErrors.password) setModalErrors((p) => ({ ...p, password: '' }));
                      }}
                      className={`w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${modalErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    />
                    {modalErrors.password && <p className="mt-1 text-xs text-red-600">• {modalErrors.password}</p>}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center space-x-2">
                  {saving && <Spinner />}
                  <span>{saving ? 'Saving...' : (editItem ? 'Update' : 'Create')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div className={`rounded-xl p-6 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
