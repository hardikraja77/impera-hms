<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Patient extends Model
{
    use HasFactory;

    // Static profile data only (no visit-level fields)
    protected $fillable = [
        'name',
        'age',
        'gender',
        'phone',
        'doctor_id',
        'created_by',
        'status',
        'family_id',
        'relation',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * All visits (consultations) for this patient.
     */
    public function consultations(): HasMany
    {
        return $this->hasMany(Consultation::class);
    }

    /**
     * The latest consultation (for backward compatibility).
     */
    public function consultation(): HasOne
    {
        return $this->hasOne(Consultation::class)->latestOfMany();
    }

    /**
     * Active / current consultation.
     */
    public function activeConsultation(): HasOne
    {
        return $this->hasOne(Consultation::class)
            ->whereIn('status', ['in_progress', 'pending'])
            ->latestOfMany();
    }

    public function whatsappReminders(): HasMany
    {
        return $this->hasMany(WhatsappReminder::class);
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'family_id');
    }

    public function familyMembers(): HasMany
    {
        return $this->hasMany(Patient::class, 'family_id');
    }
}
