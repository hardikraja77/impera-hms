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

    protected $fillable = [
        'name',
        'age',
        'gender',
        'phone',
        'symptoms',
        'doctor_id',
        'created_by',
        'status',
        'family_id',
        'relation',
        'appointment_time',
    ];

    protected $casts = [
        'appointment_time' => 'datetime',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function consultation(): HasOne
    {
        return $this->hasOne(Consultation::class);
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