<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Default user channel
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// ── Doctor Channels ──
// Each doctor gets their own private channel for assigned patient updates
Broadcast::channel('doctor.{doctorId}', function ($user, $doctorId) {
    return $user->role === 'doctor'
        && $user->doctor
        && (int) $user->doctor->id === (int) $doctorId;
});

// ── Admin Channels ──
// All admins can listen to the admin dashboard channel
Broadcast::channel('admin.dashboard', function ($user) {
    return $user->role === 'admin';
});

// ── Receptionist Channels ──
// Each receptionist gets their own channel for updates on patients they created
Broadcast::channel('receptionist.{receptionistId}', function ($user, $receptionistId) {
    return $user->role === 'receptionist'
        && (int) $user->id === (int) $receptionistId;
});
