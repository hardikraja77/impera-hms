<?php

namespace App\Http\Controllers\Api;

use App\Events\ConsultationUpdated;
use App\Events\DoctorAvailabilityChanged;
use App\Events\PatientStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\Patient;
use App\Models\WhatsappReminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorController extends Controller
{
    public function __construct()
    {
        // All methods require authenticated doctor
    }

    /**
     * Get the authenticated doctor's profile
     */
    public function profile(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;

        if (!$doctor) {
            return response()->json(['message' => 'Doctor profile not found'], 404);
        }

        return response()->json($doctor->load('user'));
    }

    /**
     * New enquiries — consultations pending for this doctor
     * Shows patients with status assigned/pending/enquired and their latest pending consultation
     */
    public function newEnquiries(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;

        // Get patients assigned to this doctor with pending/in_progress consultations
        $patients = Patient::where('doctor_id', $doctor->id)
            ->whereIn('status', ['pending', 'enquired', 'assigned'])
            ->with(['creator', 'consultation' => function ($q) {
                $q->whereIn('status', ['pending', 'in_progress'])->latest();
            }])
            ->latest()
            ->get();

        return response()->json($patients);
    }

    /**
     * Consulted patients — active consultations
     */
    public function consultedPatients(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;

        $patients = Patient::where('doctor_id', $doctor->id)
            ->where('status', 'consulted')
            ->with(['creator', 'consultation' => function ($q) {
                $q->where('status', 'in_progress')->latest();
            }])
            ->latest()
            ->get();

        return response()->json($patients);
    }

    /**
     * Completed cases
     */
    public function completedCases(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;

        $patients = Patient::where('doctor_id', $doctor->id)
            ->where('status', 'completed')
            ->with(['creator', 'consultation'])
            ->latest()
            ->get();

        return response()->json($patients);
    }

    /**
     * Today's follow-ups (supports optional date filter)
     */
    public function todayFollowups(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;
        $date = $request->date ?? now()->toDateString();

        $patients = Patient::where('doctor_id', $doctor->id)
            ->whereHas('consultation', function ($q) use ($date) {
                $q->whereDate('next_appointment', $date);
            })
            ->with(['creator', 'consultation'])
            ->latest()
            ->get();

        return response()->json($patients);
    }

    /**
     * Get visit history for a specific patient
     */
    public function visitHistory(Request $request, int $patientId): JsonResponse
    {
        $doctor = $request->user()->doctor;
        $patient = Patient::where('id', $patientId)
            ->where('doctor_id', $doctor->id)
            ->firstOrFail();

        $consultations = Consultation::where('patient_id', $patientId)
            ->with('doctor.user')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'patient' => $patient,
            'visits' => $consultations,
        ]);
    }

    /**
     * Start consultation for a patient
     */
    public function startConsultation(Request $request, int $patientId): JsonResponse
    {
        $doctor = $request->user()->doctor;
        $patient = Patient::where('id', $patientId)
            ->where('doctor_id', $doctor->id)
            ->whereIn('status', ['assigned', 'pending', 'enquired'])
            ->firstOrFail();

        // Find or create the latest pending consultation for this patient+doctor
        $consultation = Consultation::where('patient_id', $patientId)
            ->where('doctor_id', $doctor->id)
            ->where('status', 'pending')
            ->first();

        if (!$consultation) {
            // No pending consultation found — create one (for legacy patients)
            $consultation = Consultation::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'status' => 'in_progress',
            ]);
        } else {
            $consultation->update(['status' => 'in_progress']);
        }

        $patient->update(['status' => 'consulted']);

        broadcast(new PatientStatusUpdated($patient, 'assigned'));
        broadcast(new ConsultationUpdated($consultation, 'started'));
        broadcast(new DoctorAvailabilityChanged($request->user()->doctor, 'busy'));

        return response()->json([
            'patient' => $patient->fresh(),
            'consultation' => $consultation,
            'message' => 'Consultation started',
        ]);
    }

    /**
     * Update consultation details
     */
    public function updateConsultation(Request $request, int $consultationId): JsonResponse
    {
        $doctor = $request->user()->doctor;

        $request->validate([
            'diagnosis' => 'nullable|string',
            'treatment' => 'nullable|string',
            'prescription' => 'nullable|string',
            'notes' => 'nullable|string',
            'next_appointment' => 'nullable|date|after_or_equal:today',
        ]);

        $consultation = Consultation::where('id', $consultationId)
            ->where('doctor_id', $doctor->id)
            ->firstOrFail();

        $consultation->update($request->only([
            'diagnosis', 'treatment', 'prescription', 'notes', 'next_appointment',
        ]));

        // Update consultation vitals if provided
        $vitals = $request->only(['temperature', 'blood_pressure', 'heart_rate']);
        if (array_filter($vitals)) {
            $consultation->update($vitals);
        }

        broadcast(new ConsultationUpdated($consultation, 'updated'));

        return response()->json([
            'consultation' => $consultation,
            'message' => 'Consultation updated',
        ]);
    }

    /**
     * Complete a consultation
     */
    public function completeConsultation(Request $request, int $consultationId): JsonResponse
    {
        $doctor = $request->user()->doctor;

        $request->validate([
            'diagnosis' => 'nullable|string',
            'treatment' => 'nullable|string',
            'prescription' => 'nullable|string',
            'notes' => 'nullable|string',
            'next_appointment' => 'nullable|date|after_or_equal:today',
        ]);

        $consultation = Consultation::where('id', $consultationId)
            ->where('doctor_id', $doctor->id)
            ->firstOrFail();

        $consultation->update(array_merge(
            $request->only(['diagnosis', 'treatment', 'prescription', 'notes', 'next_appointment']),
            ['status' => 'completed']
        ));

        // Update consultation vitals if provided
        $vitals = $request->only(['temperature', 'blood_pressure', 'heart_rate']);
        if (array_filter($vitals)) {
            $consultation->update($vitals);
        }

        // Check if patient has any other active consultations
        $hasOtherActive = Consultation::where('patient_id', $consultation->patient_id)
            ->where('id', '!=', $consultationId)
            ->whereIn('status', ['pending', 'in_progress'])
            ->exists();

        // Only mark patient as completed if no other active consultations
        if (!$hasOtherActive) {
            $consultation->patient->update(['status' => 'completed']);
            broadcast(new DoctorAvailabilityChanged($request->user()->doctor, 'available'));
        }

        // Create follow-up reminder if next appointment is set
        if ($consultation->next_appointment) {
            WhatsappReminder::create([
                'patient_id' => $consultation->patient_id,
                'consultation_id' => $consultation->id,
                'reminder_date' => $consultation->next_appointment,
            ]);
        }

        broadcast(new ConsultationUpdated($consultation, 'completed'));
        broadcast(new PatientStatusUpdated($consultation->patient, 'consulted'));

        return response()->json([
            'consultation' => $consultation,
            'message' => 'Consultation completed',
        ]);
    }

    /**
     * Send WhatsApp reminder
     */
    public function sendWhatsAppReminder(Request $request, int $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);
        $phone = preg_replace('/[^0-9]/', '', $patient->phone);

        $message = urlencode("Hello {$patient->name}, this is your appointment reminder for today.");
        $whatsappUrl = "https://wa.me/{$phone}?text={$message}";

        WhatsappReminder::updateOrCreate(
            [
                'patient_id' => $patientId,
                'reminder_date' => now()->toDateString(),
            ],
            [
                'sent' => true,
                'sent_at' => now(),
            ]
        );

        return response()->json([
            'whatsapp_url' => $whatsappUrl,
            'message' => 'WhatsApp reminder link generated',
        ]);
    }
}
