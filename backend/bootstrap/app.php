<?php

use App\Http\Middleware\RoleMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        channels: __DIR__.'/../routes/channels.php',
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);

        // NOTE: We deliberately do NOT call $middleware->statefulApi().
        //
        // This API is 100% stateless token auth (Sanctum personal access tokens +
        // "Authorization: Bearer" header, stored in localStorage on the SPA). The
        // SPA never calls /sanctum/csrf-cookie and never sends a CSRF token, and
        // Laravel Echo authenticates the broadcasting channel with the Bearer
        // token too. statefulApi() would inject VerifyCsrfToken into the API
        // stack for any request whose Origin matches a "stateful" domain
        // (config/sanctum.php -> SANCTUM_STATEFUL_DOMAINS, which by default also
        // includes APP_URL's host). In production the SPA's Origin matches that
        // host, so VerifyCsrfToken runs and rejects the login with
        // "419 CSRF token mismatch" because no CSRF token is ever sent. Removing
        // statefulApi() makes the API purely stateless and eliminates the 419 in
        // every environment while leaving Bearer-token + Echo auth fully working.
        //
        // This is a token-based (Sanctum) API with no named "login" route.
        // When an unauthenticated request hits a protected route and does NOT
        // send Accept: application/json (raw browser / curl / fetch calls),
        // Laravel's default guest-redirect tries route('login'), which does not
        // exist and throws RouteNotFoundException -> 500 "Route [login] not
        // defined" (seen in laravel.log). Returning null disables that
        // redirect; the AuthenticationException render callback below then
        // answers every unauthenticated request with a clean JSON 401.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Always respond to unauthenticated API requests with JSON 401,
        // regardless of the Accept header (no HTML redirects to a
        // non-existent "login" route).
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json([
                'message' => $e->getMessage() ?: 'Unauthenticated.',
            ], 401);
        });

        // Attach the HTTP request details to every reported exception so the
        // logs show WHICH endpoint failed (method + URL + IP). Without this,
        // laravel.log only shows the stack trace and the failing endpoint is
        // not identifiable ("undefined" in the logs).
        $exceptions->context(function (Throwable $e, array $context) {
            $request = request();

            if (! $request) {
                return [];
            }

            return [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'ip' => $request->ip(),
            ];
        });
    })->create();
