<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\ReceptionistController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// ── Public Routes ──

Route::post('/login', [AuthController::class, 'login']);

// ── Authenticated Routes ──

Route::middleware('auth:sanctum')->group(function () {
    // Broadcast channel authorization (Laravel Echo posts here with the Bearer token
    // before subscribing to private channels such as doctor.{id} / admin.dashboard)
    Route::post('/broadcasting/auth', function (Request $request) {
        return Broadcast::auth($request);
    });

    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/logout-all', [AuthController::class, 'logoutAll']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/token/info', [AuthController::class, 'tokenInfo']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // ── Admin Routes ──

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        // Doctors
        Route::get('/doctors', [AdminController::class, 'indexDoctors']);
        Route::post('/doctors', [AdminController::class, 'storeDoctor']);
        Route::put('/doctors/{id}', [AdminController::class, 'updateDoctor']);
        Route::delete('/doctors/{id}', [AdminController::class, 'destroyDoctor']);

        // Receptionists
        Route::get('/receptionists', [AdminController::class, 'indexReceptionists']);
        Route::post('/receptionists', [AdminController::class, 'storeReceptionist']);
        Route::put('/receptionists/{id}', [AdminController::class, 'updateReceptionist']);
        Route::delete('/receptionists/{id}', [AdminController::class, 'destroyReceptionist']);

        // Analytics
        Route::get('/analytics', [AdminController::class, 'analytics']);

        // All patients
        Route::get('/patients', [AdminController::class, 'indexPatients']);

        // Next appointments (follow-ups)
        Route::get('/next-appointments', [AdminController::class, 'nextAppointments']);
    });

    // ── Doctor Routes ──

    Route::middleware('role:doctor')->prefix('doctor')->group(function () {
        Route::get('/profile', [DoctorController::class, 'profile']);
        Route::get('/new-enquiries', [DoctorController::class, 'newEnquiries']);
        Route::get('/consulted-patients', [DoctorController::class, 'consultedPatients']);
        Route::get('/completed-cases', [DoctorController::class, 'completedCases']);
        Route::get('/today-followups', [DoctorController::class, 'todayFollowups']);
        Route::post('/start-consultation/{patientId}', [DoctorController::class, 'startConsultation']);
        Route::get('/visit-history/{patientId}', [DoctorController::class, 'visitHistory']);
        Route::put('/consultation/{consultationId}', [DoctorController::class, 'updateConsultation']);
        Route::post('/complete-consultation/{consultationId}', [DoctorController::class, 'completeConsultation']);
        Route::post('/whatsapp-reminder/{patientId}', [DoctorController::class, 'sendWhatsAppReminder']);
    });

    // ── Receptionist Routes ──

    Route::middleware('role:receptionist')->prefix('receptionist')->group(function () {
        Route::get('/doctors', [ReceptionistController::class, 'doctors']);
        Route::post('/patients', [ReceptionistController::class, 'storePatient']);
        Route::get('/patients', [ReceptionistController::class, 'patients']);
        Route::get('/patients/by-phone', [ReceptionistController::class, 'findByPhone']);
        Route::post('/visits', [ReceptionistController::class, 'storeVisit']);
        Route::get('/patients/{id}/family', [ReceptionistController::class, 'familyMembers']);
        Route::get('/scheduled-patients', [ReceptionistController::class, 'scheduledPatients']);
        Route::get('/next-appointments', [ReceptionistController::class, 'nextAppointments']);
        Route::put('/patients/{id}/status', [ReceptionistController::class, 'updateStatus']);
        Route::post('/patients/{id}/whatsapp-enquiry', [ReceptionistController::class, 'whatsappEnquiry']);
    });
});
