<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login and issue Sanctum token
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'role' => 'required|in:admin,doctor,receptionist',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->role !== $request->role) {
            throw ValidationException::withMessages([
                'role' => ['You do not have access to this login.'],
            ]);
        }

        // Revoke existing tokens for this device (optional: prevents multiple active sessions)
        // $user->tokens()->delete();

        $token = $user->createToken('auth-token', [$user->role])->plainTextToken;

        return response()->json([
            'user' => $this->userPayload($user),
            'token' => $token,
            'expires_at' => now()->addMinutes(config('sanctum.expiration', 1440))->toIso8601String(),
        ]);
    }

    /**
     * Logout - revoke current token
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Logout from all devices - revoke all tokens
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Logged out from all devices',
        ]);
    }

    /**
     * Get authenticated user info
     */
    public function user(Request $request): JsonResponse
    {
        return response()->json($this->userPayload($request->user()));
    }

    /**
     * Shared authenticated-user payload used by both /login and /user.
     *
     * The doctor sub-object MUST be present in the login response too:
     * the DoctorDashboard derives its private channel name from
     * `user.doctor.id` — if it is missing the client subscribes to
     * "doctor.undefined", channel auth returns 403, and the socket stays
     * "connected" while no events ever arrive.
     */
    private function userPayload(User $user): array
    {
        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
        ];

        if ($user->role === 'doctor' && $user->doctor) {
            $data['doctor'] = [
                'id' => $user->doctor->id,
                'specialization' => $user->doctor->specialization,
            ];
        }

        return $data;
    }

    /**
     * Get current token info
     */
    public function tokenInfo(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        return response()->json([
            'id' => $token->id,
            'name' => $token->name,
            'abilities' => $token->abilities,
            'created_at' => $token->created_at,
            'updated_at' => $token->updated_at,
            'expires_at' => $token->expires_at,
        ]);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update([
            'password' => bcrypt($request->new_password),
        ]);

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }
}
