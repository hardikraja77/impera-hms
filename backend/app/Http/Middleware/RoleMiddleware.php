<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            Log::warning('RoleMiddleware: Unauthenticated access attempt', [
                'path' => $request->path(),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Unauthenticated. Please login.',
            ], 401);
        }

        if (!in_array($user->role, $roles)) {
            Log::warning('RoleMiddleware: Unauthorized access attempt', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'required_roles' => $roles,
                'path' => $request->path(),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Access denied. You do not have the required role.',
                'your_role' => $user->role,
                'required_roles' => $roles,
            ], 403);
        }

        return $next($request);
    }
}
