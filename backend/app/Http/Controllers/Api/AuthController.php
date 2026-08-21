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
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
            ],
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
        $user = $request->user();

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

        return response()->json($data);
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
}
