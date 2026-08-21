<?php

namespace App\Events;

use App\Models\Patient;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PatientStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Patient $patient,
        public string $oldStatus,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('doctor.' . $this->patient->doctor_id),
            new PrivateChannel('admin.dashboard'),
            new PrivateChannel('receptionist.' . $this->patient->created_by),
        ];
    }

    public function broadcastAs(): string
    {
        return 'patient.status.updated';
    }

    public function broadcastWith(): array
    {
        $this->patient->load(['doctor.user', 'creator', 'consultation']);

        return [
            'patient' => [
                'id' => $this->patient->id,
                'name' => $this->patient->name,
                'status' => $this->patient->status,
                'old_status' => $this->oldStatus,
                'doctor_id' => $this->patient->doctor_id,
                'doctor_name' => $this->patient->doctor?->user?->name,
                'created_by' => $this->patient->created_by,
                'updated_at' => $this->patient->updated_at->toISOString(),
            ],
            'message' => "Patient {$this->patient->name} status changed from {$this->oldStatus} to {$this->patient->status}",
        ];
    }
}
