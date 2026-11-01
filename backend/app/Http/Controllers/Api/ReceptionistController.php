<?php

namespace App\Http\Controllers\Api;

use App\Events\ConsultationUpdated;
use App\Events\PatientCreated;
use App\Events\PatientStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Consultation;
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
     * Returns patient profiles, family members, and visit (consultation) history
     */
    public function findByPhone(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|max:20',
        ]);

        $phone = $request->phone;

        // Find the latest patient profile for this phone
        $patient = Patient::where('phone', $phone)
            ->with(['doctor.user', 'creator'])
            ->latest()
            ->first();

        if (!$patient) {
            return response()->json([
                'exists' => false,
                'message' => 'No patient found with this phone number',
            ]);
        }

        // Get all profiles under this phone (family members) — query by phone directly
        $familyMembers = Patient::where('phone', $phone)
            ->with(['doctor.user', 'consultation'])
            ->get();

        // Get all visit history (consultations) for this phone number
        $patientIds = $familyMembers->pluck('id');
        $visitHistory = Consultation::whereIn('patient_id', $patientIds)
            ->with(['doctor.user', 'patient', 'creator'])
            ->latest()
            ->get();

        // Check if "Myself" profile already exists
        $hasMyself = Patient::where('phone', $phone)
            ->whereRaw('LOWER(relation) = ?', ['myself'])
            ->exists();

        return response()->json([
            'exists' => true,
            'patient' => $patient,
            'family_members' => $familyMembers,
            'visit_history' => $visitHistory,
            'has_myself' => $hasMyself,
        ]);
    }

    /**
     * Get family members for a patient
     */
    public function familyMembers(Request $request, int $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);

        $familyMembers = Patient::where('phone', $patient->phone)
            ->with(['doctor.user', 'consultation'])
            ->get();

        return response()->json($familyMembers);
    }

    /**
     * Store a new patient (first visit — creates patient profile + consultation)
     */
    public function storePatient(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'age' => 'required|integer|min:1|max:150',
            'gender' => 'required|in:male,female,other',
            'phone' => 'required|string|max:20',
            'symptoms' => 'nullable|string',
            'temperature' => 'nullable|string|max:20',
            'blood_pressure' => 'nullable|string|max:20',
            'heart_rate' => 'nullable|string|max:20',
            'doctor_id' => 'required|exists:doctors,id',
            'relation' => 'nullable|string|max:50',
            'family_id' => 'nullable|exists:patients,id',
            'appointment_time' => 'nullable|date',
        ]);

        // Prevent duplicate family member (same phone + name + relation)
        $duplicateCheck = Patient::where('phone', $request->phone)
            ->whereRaw('LOWER(name) = ?', [strtolower($request->name)])
            ->whereRaw('LOWER(relation) = ?', [strtolower($request->relation ?? 'myself')])
            ->first();

        if ($duplicateCheck) {
            return response()->json([
                'message' => $request->name . ' (' . ($request->relation ?? 'Myself') . ') already exists under this phone number.',
            ], 422);
        }

        // Auto-determine family_id: use the earliest patient under this phone as family head
        $familyId = $request->family_id;
        if (!$familyId) {
            $existingFamilyHead = Patient::where('phone', $request->phone)
                ->orderBy('id')
                ->first();
            $familyId = $existingFamilyHead?->id;
        }

        // Create patient profile (static data)
        $patient = Patient::create([
            'name' => $request->name,
            'age' => $request->age,
            'gender' => $request->gender,
            'phone' => $request->phone,
            'doctor_id' => $request->doctor_id,
            'created_by' => $request->user()->id,
            'status' => 'assigned',
            'relation' => $request->relation,
            'family_id' => $familyId,
        ]);

        // Create initial consultation (visit) record
        $consultation = Consultation::create([
            'patient_id' => $patient->id,
            'doctor_id' => $request->doctor_id,
            'symptoms' => $request->symptoms,
            'temperature' => $request->temperature,
            'blood_pressure' => $request->blood_pressure,
            'heart_rate' => $request->heart_rate,
            'appointment_time' => $request->appointment_time,
            'created_by' => $request->user()->id,
            'status' => 'pending',
        ]);

        // Broadcast real-time event
        broadcast(new PatientCreated($patient, true));

        return response()->json([
            'patient' => $patient->load(['doctor.user', 'creator', 'consultation']),
            'consultation' => $consultation,
            'message' => 'Patient registered and first visit created successfully',
        ], 201);
    }

    /**
     * Create a new visit for an existing patient (returning patient)
     */
    public function storeVisit(Request $request): JsonResponse
    {
        $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'symptoms' => 'nullable|string',
            'temperature' => 'nullable|string|max:20',
            'blood_pressure' => 'nullable|string|max:20',
            'heart_rate' => 'nullable|string|max:20',
            'doctor_id' => 'required|exists:doctors,id',
            'appointment_time' => 'nullable|date',
        ]);

        $patient = Patient::findOrFail($request->patient_id);

        // Create new consultation (visit) record
        $consultation = Consultation::create([
            'patient_id' => $patient->id,
            'doctor_id' => $request->doctor_id,
            'symptoms' => $request->symptoms,
            'temperature' => $request->temperature,
            'blood_pressure' => $request->blood_pressure,
            'heart_rate' => $request->heart_rate,
            'appointment_time' => $request->appointment_time,
            'created_by' => $request->user()->id,
            'status' => 'pending',
        ]);

        // Update patient's current doctor and status
        $patient->update([
            'doctor_id' => $request->doctor_id,
            'status' => 'assigned',
        ]);

        // Broadcast real-time event
        broadcast(new PatientCreated($patient));

        return response()->json([
            'patient' => $patient->fresh(['doctor.user', 'creator', 'consultation']),
            'consultation' => $consultation,
            'message' => 'New visit created successfully for ' . $patient->name,
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
            ->whereHas('consultation', function ($q) use ($date) {
                $q->whereDate('appointment_time', $date);
            })
            ->with(['doctor.user', 'consultation'])
            ->orderBy('appointment_time')
            ->get();

        // Also get patients created today without appointment_time
        $createdToday = Patient::where('created_by', $request->user()->id)
            ->whereDate('created_at', $date)
            ->whereDoesntHave('consultation', function ($q) use ($date) {
                $q->whereDate('appointment_time', $date);
            })
            ->with(['doctor.user', 'consultation'])
            ->get();

        return response()->json($patients->merge($createdToday)->values());
    }

    /**
     * Get doctor-assigned follow-up / next appointments
     */
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
        ->sortBy('consultation.next_appointment')
        ->values();

        return response()->json($patients);
    }

    /**
     * Update patient status
     */
    public function updateStatus(Request $request, int $patientId): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,enquired,assigned,consulted,completed',
        ]);

        $patient = Patient::findOrFail($patientId);
        $oldStatus = $patient->status;
        $patient->update(['status' => $request->status]);

        broadcast(new PatientStatusUpdated($patient, $oldStatus));

        return response()->json([
            'patient' => $patient->fresh(['doctor.user', 'consultation']),
            'message' => 'Patient status updated successfully',
        ]);
    }

    /**
     * Generate WhatsApp enquiry link
     */
    public function whatsappEnquiry(Request $request, int $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);
        $phone = preg_replace('/[^0-9]/', '', $patient->phone);

        $hospitalName = config('app.name', 'HealthCare');
        $consultation = $patient->consultation;
        $appointmentTime = $consultation && $consultation->appointment_time
            ? \Carbon\Carbon::parse($consultation->appointment_time)->format('g:i A')
            : 'your scheduled time';

        $message = "Hello {$patient->name},\n";
        $message .= "This is from {$hospitalName}.\n";
        $message .= "Your appointment is scheduled at {$appointmentTime}.\n";
        $message .= "Please confirm your availability.";

        $whatsappUrl = "https://wa.me/{$phone}?text=" . urlencode($message);

        $oldStatus = $patient->status;
        $patient->update(['status' => 'enquired']);

        // Other dashboards must learn about the status change too — without this
        // broadcast the doctor/admin dashboards stay stale after a WhatsApp enquiry.
        broadcast(new PatientStatusUpdated($patient, $oldStatus));

        return response()->json([
            'whatsapp_url' => $whatsappUrl,
            'patient' => $patient->fresh(['doctor.user', 'consultation']),
            'message' => 'WhatsApp enquiry link generated and status updated to Enquired',
        ]);
    }
}
