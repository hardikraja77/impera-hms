<?php

namespace App\Events;

use App\Models\Patient;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PatientCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Patient $patient,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            // Broadcast to the assigned doctor's private channel
            new PrivateChannel('doctor.' . $this->patient->doctor_id),
            // Broadcast to all admins
            new PrivateChannel('admin.dashboard'),
            // Broadcast to the receptionist who created it
            new PrivateChannel('receptionist.' . $this->patient->created_by),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'patient.created';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->patient->load(['doctor.user', 'creator']);

        return [
            'patient' => [
                'id' => $this->patient->id,
                'name' => $this->patient->name,
                'age' => $this->patient->age,
                'gender' => $this->patient->gender,
                'phone' => $this->patient->phone,
                'symptoms' => $this->patient->symptoms,
                'status' => $this->patient->status,
                'doctor_id' => $this->patient->doctor_id,
                'doctor_name' => $this->patient->doctor?->user?->name,
                'created_by' => $this->patient->created_by,
                'creator_name' => $this->patient->creator?->name,
                'appointment_time' => $this->patient->appointment_time?->toISOString(),
                'created_at' => $this->patient->created_at->toISOString(),
            ],
            'message' => "New patient {$this->patient->name} registered and assigned to Dr. {$this->patient->doctor?->user?->name}",
        ];
    }
}
