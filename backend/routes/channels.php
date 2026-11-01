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
| IMPORTANT — matching order:
| Laravel authorizes a private channel by walking the registered patterns
| in order and STOPS on the first match: a callback that returns `false`
| throws 403 immediately (later patterns are never tried). A wildcard such
| as `receptionist.{receptionistId}` also matches a literal segment (its
| `{receptionistId}` placeholder accepts `dashboard`), so literal channel
| names MUST be registered BEFORE the wildcards, and wildcard callbacks
| return `null` (keep looking) instead of `false` when the segment is not
| numeric. Without this, every subscription to `receptionist.dashboard`
| failed with 403 on /api/broadcasting/auth even though the socket itself
| stayed connected.
|
| Auth note: this API is token-based (Sanctum), so every channel below passes
| `['guards' => ['sanctum']]`. Laravel's broadcaster otherwise resolves the
| user via the request's default (session `web`) guard, which has no identity
| for Bearer-token requests — every subscription would 403. The guards option
| makes the callback receive the user authenticated from the Bearer token on
| POST /api/broadcasting/auth (which is itself behind `auth:sanctum`).
*/

// Default user channel
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
}, ['guards' => ['sanctum']]);

// ── Shared Dashboard Channels ──
// Register literal channel names BEFORE the per-user wildcards below —
// see the matching-order note at the top of this file.

// All admins can listen to the admin dashboard channel
Broadcast::channel('admin.dashboard', function ($user) {
    return $user->role === 'admin';
}, ['guards' => ['sanctum']]);

// All receptionists can listen to clinic-wide updates (e.g. doctor availability)
Broadcast::channel('receptionist.dashboard', function ($user) {
    return $user->role === 'receptionist';
}, ['guards' => ['sanctum']]);

// ── Doctor Channels ──
// Each doctor gets their own private channel for assigned patient updates.
// Return null (not false) when the segment is not numeric so a channel such
// as a hypothetical "doctor.something" can still be authorized by a later,
// more specific pattern instead of dying with a 403 here.
Broadcast::channel('doctor.{doctorId}', function ($user, $doctorId) {
    if (! is_numeric($doctorId)) {
        return null;
    }

    return $user->role === 'doctor'
        && $user->doctor
        && (int) $user->doctor->id === (int) $doctorId;
}, ['guards' => ['sanctum']]);

// ── Receptionist Channels ──
// Each receptionist gets their own channel for updates on patients they created
Broadcast::channel('receptionist.{receptionistId}', function ($user, $receptionistId) {
    if (! is_numeric($receptionistId)) {
        return null;
    }

    return $user->role === 'receptionist'
        && (int) $user->id === (int) $receptionistId;
}, ['guards' => ['sanctum']]);
