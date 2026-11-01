<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * End-to-end tests for the WebSocket channel authorization route
 * (POST /api/broadcasting/auth), which Laravel Echo calls with the Bearer
 * token before subscribing to any private channel.
 *
 * Regression covered: `receptionist.dashboard` used to return 403 for every
 * receptionist because the wildcard `receptionist.{receptionistId}` pattern
 * matched the literal segment "dashboard" first and its callback returned
 * `false` (Laravel throws 403 on the first false match and never tries the
 * exact pattern registered later). The socket stayed "connected" while the
 * shared dashboard channel could never be joined — no real-time events.
 */
class BroadcastAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Exercise the real Pusher/Reverb authorizer so channel callbacks run
        // and the private-channel HMAC signature is produced. Channel auth only
        // signs a string locally — no live Reverb server is required.
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => env('REVERB_APP_KEY', 'test-key'),
            'broadcasting.connections.reverb.secret' => env('REVERB_APP_SECRET', 'test-secret'),
            'broadcasting.connections.reverb.app_id' => env('REVERB_APP_ID', 'test-app-id'),
        ]);

        // The broadcast connection defaults to 'null' under phpunit, so during
        // app boot routes/channels.php registered its callbacks on the null
        // broadcaster. Re-register them on the now-active reverb connection;
        // otherwise every auth request 403s (no matching channel patterns).
        require base_path('routes/channels.php');
    }

    private function userWithRole(string $role, bool $withDoctor = false): User
    {
        $user = User::factory()->create([
            'role' => $role,
            'phone' => '9999999999',
        ]);

        if ($withDoctor) {
            Doctor::create([
                'user_id' => $user->id,
                'specialization' => 'General Physician',
                'phone' => '8888888888',
                'consultation_fee' => 500,
                'available_days' => ['Mon'],
                'available_from' => '09:00',
                'available_to' => '17:00',
            ]);
        }

        return $user;
    }

    private function authAs(User $user, string $privateChannel): TestResponse
    {
        Sanctum::actingAs($user);

        return $this->postJson('/api/broadcasting/auth', [
            'channel_name' => $privateChannel,
            'socket_id' => '1234.5678',
        ]);
    }

    public function test_doctor_can_join_own_private_channel(): void
    {
        $doctor = $this->userWithRole('doctor', withDoctor: true);

        $response = $this->authAs($doctor, "private-doctor.{$doctor->doctor->id}");

        $response->assertOk();
        $response->assertJsonStructure(['auth']);
        $this->assertStringContainsString(':', $response->json('auth'));
    }

    public function test_doctor_cannot_join_another_doctors_channel(): void
    {
        $doctor = $this->userWithRole('doctor', withDoctor: true);
        $otherDoctor = $this->userWithRole('doctor', withDoctor: true);

        $this->authAs($doctor, "private-doctor.{$otherDoctor->doctor->id}")
            ->assertForbidden();
    }

    public function test_doctor_cannot_join_admin_dashboard(): void
    {
        $doctor = $this->userWithRole('doctor', withDoctor: true);

        $this->authAs($doctor, 'private-admin.dashboard')->assertForbidden();
    }

    public function test_admin_can_join_admin_dashboard(): void
    {
        $admin = $this->userWithRole('admin');

        $this->authAs($admin, 'private-admin.dashboard')->assertOk();
    }

    public function test_receptionist_can_join_shared_receptionist_dashboard(): void
    {
        $receptionist = $this->userWithRole('receptionist');

        // Regression: this used to 403 for every receptionist because the
        // receptionist.{receptionistId} wildcard swallowed the literal
        // "dashboard" segment before the exact pattern could authorize it.
        $this->authAs($receptionist, 'private-receptionist.dashboard')->assertOk();
    }

    public function test_receptionist_can_join_own_private_channel(): void
    {
        $receptionist = $this->userWithRole('receptionist');

        $this->authAs($receptionist, "private-receptionist.{$receptionist->id}")->assertOk();
    }

    public function test_receptionist_cannot_join_doctor_or_admin_channels(): void
    {
        $receptionist = $this->userWithRole('receptionist');
        $doctor = $this->userWithRole('doctor', withDoctor: true);

        $this->authAs($receptionist, "private-doctor.{$doctor->doctor->id}")->assertForbidden();
        $this->authAs($receptionist, 'private-admin.dashboard')->assertForbidden();
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.dashboard',
            'socket_id' => '1234.5678',
        ])->assertUnauthorized();
    }
}
