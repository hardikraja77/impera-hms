<?php

namespace App\Http\Controllers\Api;

use App\Events\PatientCreated;
use App\Events\PatientStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReceptionistController extends Controller
{
    /**
     * List all active doctors (for dropdown)
     */
    public function doctors(): JsonResponse
    {
        $doctors = Doctor::where('is_active', true)
            ->with('user')
            ->get();

        return response()->json($doctors);
    }

    /**
     * Smart phone number detection — fetch patient by phone
     * Returns patient details, family members, and visit history
     */
    public function findByPhone(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|max:20',
        ]);

        $phone = $request->phone;
        $patient = Patient::where('phone', $phone)
            ->with(['doctor.user', 'creator', 'consultation'])
            ->latest()
            ->first();

        if (!$patient) {
            return response()->json([
                'exists' => false,
                'message' => 'No patient found with this phone number',
            ]);
        }

        // Get family members (patients sharing the same family_id or this patient as head)
        $familyMembers = Patient::where(function ($q) use ($patient) {
            $q->where('family_id', $patient->family_id ?? $patient->id)
              ->orWhere('id', $patient->family_id ?? $patient->id);
        })
        ->with(['doctor.user'])
        ->get();

        // Get visit history
        $visitHistory = Patient::where('phone', $phone)
            ->with(['doctor.user', 'consultation'])
            ->latest()
            ->get();

        return response()->json([
            'exists' => true,
            'patient' => $patient,
            'family_members' => $familyMembers,
            'visit_history' => $visitHistory,
        ]);
    }

    /**
     * Get family members for a patient
     */
    public function familyMembers(Request $request, int $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);

        $familyMembers = Patient::where(function ($q) use ($patient) {
            $q->where('family_id', $patient->family_id ?? $patient->id)
              ->orWhere('id', $patient->family_id ?? $patient->id);
        })
        ->with(['doctor.user'])
        ->get();

        return response()->json($familyMembers);
    }

    /**
     * Store a new patient (with family linking and appointment)
     */
    public function storePatient(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'age' => 'required|integer|min:1|max:150',
            'gender' => 'required|in:male,female,other',
            'phone' => 'required|string|max:20',
            'symptoms' => 'nullable|string',
            'doctor_id' => 'required|exists:doctors,id',
            'relation' => 'nullable|string|max:50',
            'family_id' => 'nullable|exists:patients,id',
            'appointment_time' => 'nullable|date',
        ]);

        $patient = Patient::create([
            'name' => $request->name,
            'age' => $request->age,
            'gender' => $request->gender,
            'phone' => $request->phone,
            'symptoms' => $request->symptoms,
            'doctor_id' => $request->doctor_id,
            'created_by' => $request->user()->id,
            'status' => 'assigned',
            'relation' => $request->relation,
            'family_id' => $request->family_id,
            'appointment_time' => $request->appointment_time,
        ]);

        // Broadcast real-time event to doctor, admin, and receptionist
        broadcast(new PatientCreated($patient));

        return response()->json([
            'patient' => $patient->load(['doctor.user', 'creator']),
            'message' => 'Patient added and assigned successfully',
        ], 201);
    }

    /**
     * List patients added by this receptionist (read-only)
     */
    public function patients(Request $request): JsonResponse
    {
        $query = Patient::where('created_by', $request->user()->id)
            ->with(['doctor.user', 'consultation']);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $patients = $query->latest()->paginate(20);

        return response()->json($patients);
    }

    /**
     * Get today's / scheduled patients (supports date filter)
     */
    public function scheduledPatients(Request $request): JsonResponse
    {
        $date = $request->date ?? now()->toDateString();

        $patients = Patient::where('created_by', $request->user()->id)
            ->where(function ($q) use ($date) {
                $q->whereDate('appointment_time', $date)
                  ->orWhereDate('created_at', $date);
            })
            ->with(['doctor.user', 'consultation'])
            ->orderBy('appointment_time')
            ->get();

        return response()->json($patients);
    }

    /**
     * Get doctor-assigned follow-up / next appointments
     * Only shows patients with doctor-set next_appointments, sorted chronologically
     */
    public function nextAppointments(Request $request): JsonResponse
    {
        $today = now()->toDateString();

        $patients = Patient::whereHas('consultation', function ($q) use ($today) {
            $q->where('next_appointment', '>=', $today)
              ->whereNotNull('next_appointment');
        })
        ->with(['doctor.user', 'consultation'])
        ->orderBy('consultations.next_appointment')
        ->get();

        return response()->json($patients);
    }

    /**
     * Update patient status (pending → enquired → completed)
     */
    public function updateStatus(Request $request, int $patientId): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,enquired,assigned,consulted,completed',
        ]);

        $patient = Patient::findOrFail($patientId);
        $oldStatus = $patient->status;
        $patient->update(['status' => $request->status]);

        // Broadcast real-time status update
        broadcast(new PatientStatusUpdated($patient, $oldStatus));

        return response()->json([
            'patient' => $patient->fresh(['doctor.user', 'consultation']),
            'message' => 'Patient status updated successfully',
        ]);
    }

    /**
     * Generate WhatsApp enquiry link and mark patient as enquired
     */
    public function whatsappEnquiry(Request $request, int $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);
        $phone = preg_replace('/[^0-9]/', '', $patient->phone);

        $hospitalName = config('app.name', 'HealthCare');
        $appointmentTime = $patient->appointment_time
            ? \Carbon\Carbon::parse($patient->appointment_time)->format('g:i A')
            : 'your scheduled time';

        $message = "Hello {$patient->name},\n";
        $message .= "This is from {$hospitalName}.\n";
        $message .= "Your appointment is scheduled at {$appointmentTime}.\n";
        $message .= "Please confirm your availability.";

        $whatsappUrl = "https://wa.me/{$phone}?text=" . urlencode($message);

        // Update status to enquired
        $patient->update(['status' => 'enquired']);

        return response()->json([
            'whatsapp_url' => $whatsappUrl,
            'patient' => $patient->fresh(['doctor.user', 'consultation']),
            'message' => 'WhatsApp enquiry link generated and status updated to Enquired',
        ]);
    }
}