<?php

namespace App\Events;

use App\Models\Consultation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConsultationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Consultation $consultation,
        public string $action,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('doctor.' . $this->consultation->doctor_id),
            new PrivateChannel('admin.dashboard'),
            new PrivateChannel('receptionist.' . $this->consultation->patient?->created_by),
        ];
    }

    public function broadcastAs(): string
    {
        return 'consultation.updated';
    }

    public function broadcastWith(): array
    {
        $this->consultation->load(['patient', 'doctor.user']);

        return [
            'consultation' => [
                'id' => $this->consultation->id,
                'patient_id' => $this->consultation->patient_id,
                'patient_name' => $this->consultation->patient?->name,
                'doctor_id' => $this->consultation->doctor_id,
                'doctor_name' => $this->consultation->doctor?->user?->name,
                'status' => $this->consultation->status,
                'diagnosis' => $this->consultation->diagnosis,
                'next_appointment' => $this->consultation->next_appointment?->toISOString(),
                'patient_status' => $this->consultation->patient?->status,
                'consultation_fee' => (float) ($this->consultation->doctor?->consultation_fee ?? 0),
                'updated_at' => $this->consultation->updated_at->toISOString(),
            ],
            'action' => $this->action,
            'message' => match ($this->action) {
                'completed' => "Consultation for {$this->consultation->patient?->name} completed by Dr. {$this->consultation->doctor?->user?->name}",
                'started' => "Consultation started for {$this->consultation->patient?->name}",
                default => "Consultation for {$this->consultation->patient?->name} updated by Dr. {$this->consultation->doctor?->user?->name}",
            },
        ];
    }
}
