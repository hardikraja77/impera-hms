<?php

namespace App\Http\Controllers\Api;

use App\Events\ConsultationUpdated;
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
     * New enquiries — patients assigned to this doctor but not yet consulted
     */
    public function newEnquiries(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;

        $patients = Patient::where('doctor_id', $doctor->id)
            ->whereIn('status', ['pending', 'enquired', 'assigned'])
            ->with('creator')
            ->latest()
            ->get();

        return response()->json($patients);
    }

    /**
     * Consulted patients — in consultation
     */
    public function consultedPatients(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;

        $patients = Patient::where('doctor_id', $doctor->id)
            ->where('status', 'consulted')
            ->with(['creator', 'consultation'])
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
     * Today's follow-ups
     */
    public function todayFollowups(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;
        $today = now()->toDateString();

        $patients = Patient::where('doctor_id', $doctor->id)
            ->whereHas('consultation', function ($q) use ($today) {
                $q->where('next_appointment', $today);
            })
            ->with(['creator', 'consultation'])
            ->latest()
            ->get();

        return response()->json($patients);
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

        $consultation = Consultation::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'in_progress',
        ]);

        $patient->update(['status' => 'consulted']);

        // Broadcast status update
        broadcast(new PatientStatusUpdated($patient, 'assigned'));

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
            'diagnosis',
            'treatment',
            'prescription',
            'notes',
            'next_appointment',
        ]));

        // Broadcast real-time consultation update
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

        $consultation->patient->update(['status' => 'completed']);

        // Create follow-up reminder if next appointment is set
        if ($consultation->next_appointment) {
            WhatsappReminder::create([
                'patient_id' => $consultation->patient_id,
                'consultation_id' => $consultation->id,
                'reminder_date' => $consultation->next_appointment,
            ]);
        }

        // Broadcast real-time consultation completed event
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

        // Mark reminder as sent for today
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
