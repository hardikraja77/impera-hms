<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    // ── Doctors ──

    public function indexDoctors(): JsonResponse
    {
        $doctors = Doctor::with('user')->get();

        return response()->json($doctors);
    }

    public function storeDoctor(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'phone' => 'nullable|string',
            'password' => 'required|string|min:6',
            'specialization' => 'required|string',
            'consultation_fee' => 'nullable|numeric|min:0',
            'available_days' => 'nullable|array',
            'available_from' => 'nullable|string',
            'available_to' => 'nullable|string',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'role' => 'doctor',
            'phone' => $request->phone,
        ]);

        $doctor = Doctor::create([
            'user_id' => $user->id,
            'specialization' => $request->specialization,
            'phone' => $request->phone,
            'consultation_fee' => $request->consultation_fee ?? 0,
            'available_days' => $request->available_days,
            'available_from' => $request->available_from ?? '09:00',
            'available_to' => $request->available_to ?? '17:00',
        ]);

        return response()->json(['doctor' => $doctor->load('user'), 'message' => 'Doctor created'], 201);
    }

    public function updateDoctor(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'phone' => 'nullable|string',
            'specialization' => 'sometimes|string',
            'consultation_fee' => 'nullable|numeric|min:0',
            'available_days' => 'nullable|array',
            'available_from' => 'nullable|string',
            'available_to' => 'nullable|string',
        ]);

        $doctor = Doctor::findOrFail($id);
        $doctor->user->update($request->only(['name', 'email', 'phone']));
        $doctor->update($request->only(['specialization', 'phone', 'consultation_fee', 'available_days', 'available_from', 'available_to']));

        return response()->json(['doctor' => $doctor->load('user'), 'message' => 'Doctor updated']);
    }

    public function destroyDoctor(int $id): JsonResponse
    {
        $doctor = Doctor::findOrFail($id);
        $doctor->user->delete();

        return response()->json(['message' => 'Doctor deleted']);
    }

    // ── Receptionists ──

    public function indexReceptionists(): JsonResponse
    {
        $receptionists = User::where('role', 'receptionist')->get();

        return response()->json($receptionists);
    }

    public function storeReceptionist(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'phone' => 'nullable|string',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'role' => 'receptionist',
            'phone' => $request->phone,
        ]);

        return response()->json(['user' => $user, 'message' => 'Receptionist created'], 201);
    }

    public function updateReceptionist(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'phone' => 'nullable|string',
        ]);

        $user = User::where('id', $id)->where('role', 'receptionist')->findOrFail($id);
        $user->update($request->only(['name', 'email', 'phone']));

        return response()->json(['user' => $user, 'message' => 'Receptionist updated']);
    }

    public function destroyReceptionist(int $id): JsonResponse
    {
        User::where('id', $id)->where('role', 'receptionist')->firstOrFail()->delete();

        return response()->json(['message' => 'Receptionist deleted']);
    }

    // ── Analytics ──

    public function analytics(Request $request): JsonResponse
    {
        $today = now()->toDateString();

        $fromDate = $request->from_date ?? now()->subDays(30)->toDateString();
        $toDate = $request->to_date ?? $today;
        $filterDoctorId = $request->doctor_id;
        $filterDepartment = $request->department;

        // Count consultations (visits) in date range
        $consultationQuery = Consultation::whereBetween('created_at', [$fromDate . ' 00:00:00', $toDate . ' 23:59:59']);
        if ($filterDoctorId) {
            $consultationQuery->where('doctor_id', $filterDoctorId);
        }

        $rangeVisits = (clone $consultationQuery)->count();

        // Overall counts
        $totalPatients = Patient::count();
        $todayVisits = Consultation::whereDate('created_at', $today)->count();
        $assignedPatients = Patient::where('status', 'assigned')->count();
        $consultedPatients = Patient::where('status', 'consulted')->count();
        $completedPatients = Patient::where('status', 'completed')->count();
        $totalDoctors = Doctor::count();
        $activeDoctors = Doctor::where('is_active', true)->count();
        $totalReceptionists = User::where('role', 'receptionist')->count();

        // Revenue tracking
        $completedConsultations = Consultation::where('status', 'completed')
            ->whereBetween('updated_at', [$fromDate . ' 00:00:00', $toDate . ' 23:59:59']);
        if ($filterDoctorId) {
            $completedConsultations->where('doctor_id', $filterDoctorId);
        }
        $totalRevenue = 0;
        $doctorRevenue = [];
        $completedConsultations->with('doctor')->each(function ($c) use (&$totalRevenue, &$doctorRevenue) {
            $fee = (float) ($c->doctor->consultation_fee ?? 0);
            $totalRevenue += $fee;
            $docId = $c->doctor_id;
            if (!isset($doctorRevenue[$docId])) {
                $doctorRevenue[$docId] = ['doctor_id' => $docId, 'name' => $c->doctor->user->name ?? 'Unknown', 'revenue' => 0, 'count' => 0];
            }
            $doctorRevenue[$docId]['revenue'] += $fee;
            $doctorRevenue[$docId]['count']++;
        });

        $todayRevenue = Consultation::where('status', 'completed')
            ->whereDate('updated_at', $today)
            ->with('doctor')
            ->get()
            ->sum(fn ($c) => (float) ($c->doctor->consultation_fee ?? 0));

        $monthStart = now()->startOfMonth()->toDateString();
        $monthlyRevenue = Consultation::where('status', 'completed')
            ->whereBetween('updated_at', [$monthStart . ' 00:00:00', now()->endOfMonth()->toDateTimeString()])
            ->with('doctor')
            ->get()
            ->sum(fn ($c) => (float) ($c->doctor->consultation_fee ?? 0));

        // Doctor-wise patient count (based on consultations in range)
        $doctorWiseCount = (clone $consultationQuery)
            ->select('doctor_id', DB::raw('count(*) as total'))
            ->groupBy('doctor_id')
            ->with('doctor.user')
            ->get();

        // Daily stats (consultations in range)
        $dailyStats = (clone $consultationQuery)
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as total'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Daily revenue trend
        $dailyRevenue = Consultation::where('status', 'completed')
            ->whereBetween('updated_at', [$fromDate . ' 00:00:00', $toDate . ' 23:59:59'])
            ->select(DB::raw('DATE(updated_at) as date'), DB::raw('count(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Appointment status distribution
        $statusDistribution = DB::table('consultations')
            ->whereBetween('created_at', [$fromDate . ' 00:00:00', $toDate . ' 23:59:59'])
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get();

        $departments = Doctor::where('is_active', true)
            ->pluck('specialization')
            ->unique()
            ->values();

        return response()->json([
            'total_patients' => $totalPatients,
            'range_patients' => $rangeVisits,
            'today_patients' => $todayVisits,
            'assigned_patients' => $assignedPatients,
            'consulted_patients' => $consultedPatients,
            'completed_patients' => $completedPatients,
            'total_doctors' => $totalDoctors,
            'active_doctors' => $activeDoctors,
            'total_receptionists' => $totalReceptionists,
            'total_revenue' => $totalRevenue,
            'today_revenue' => $todayRevenue,
            'monthly_revenue' => $monthlyRevenue,
            'doctor_revenue' => array_values($doctorRevenue),
            'doctor_wise_count' => $doctorWiseCount,
            'daily_stats' => $dailyStats,
            'daily_revenue' => $dailyRevenue,
            'status_distribution' => $statusDistribution,
            'departments' => $departments,
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'doctor_id' => $filterDoctorId,
                'department' => $filterDepartment,
            ],
        ]);
    }

    // ── Next Appointments (Follow-ups) ──

    public function nextAppointments(Request $request): JsonResponse
    {
        $patients = Patient::whereHas('consultation', function ($q) use ($request) {
            $q->whereNotNull('next_appointment');

            if ($request->has('date') && $request->date) {
                $q->whereDate('next_appointment', $request->date);
            } else {
                $q->where('next_appointment', '>=', now()->toDateString());
            }
        })
        ->with(['doctor.user', 'consultation'])
        ->get()
        ->sortBy('consultation.next_appointment');

        if ($request->doctor_id) {
            $patients = $patients->filter(fn ($p) => $p->doctor_id == $request->doctor_id);
        }

        return response()->json($patients->values());
    }

    // ── All Patients ──

    public function indexPatients(Request $request): JsonResponse
    {
        $query = Patient::with(['doctor.user', 'creator', 'consultation']);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->doctor_id) {
            $query->where('doctor_id', $request->doctor_id);
        }

        if ($request->date) {
            $query->whereDate('created_at', $request->date);
        }

        $patients = $query->latest()->paginate(20);

        return response()->json($patients);
    }
}
