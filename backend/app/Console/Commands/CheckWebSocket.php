<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * `php artisan websocket:check`
 *
 * One-command health check for the real-time layer. Probes the running Reverb
 * server with a raw WebSocket handshake (no browser, no client code) and
 * verifies the frontend/backend configuration agree. Prints the exact command
 * to run when something is missing.
 */
class CheckWebSocket extends Command
{
    protected $signature = 'websocket:check';

    protected $description = 'Verify the Reverb WebSocket server is reachable and configured correctly';

    public function handle(): int
    {
        $this->components->info('HMS WebSocket health check');

        $broadcastDriver = config('broadcasting.default');
        $host = config('reverb.servers.reverb.hostname', 'localhost');
        $port = (int) config('reverb.servers.reverb.port', 8080);
        $scheme = strtolower((string) config('reverb.apps.apps.0.options.scheme', 'http'));
        $backendKey = (string) config('reverb.apps.apps.0.key', '');
        $backendSecret = (string) config('reverb.apps.apps.0.secret', '');

        // ── 1. Broadcast driver ──
        if ($broadcastDriver !== 'reverb') {
            $this->components->error("BROADCAST_CONNECTION is '{$broadcastDriver}', expected 'reverb'.");
            $this->line('  Fix: set BROADCAST_CONNECTION=reverb in backend/.env');

            return self::FAILURE;
        }

        $this->components->twoColumnDetail('Broadcast driver', $broadcastDriver);

        // ── 2. App credentials present ──
        $credsOk = $backendKey !== '' && $backendSecret !== '' && config('reverb.apps.apps.0.app_id') !== null;
        $this->components->twoColumnDetail('REVERB_APP_KEY / SECRET / ID', $credsOk ? 'present' : 'MISSING');
        if (! $credsOk) {
            $this->components->error('Reverb app credentials are missing.');
            $this->line('  Fix: set REVERB_APP_ID, REVERB_APP_KEY and REVERB_APP_SECRET in backend/.env');
            $this->line('       then restart: php artisan reverb:start');

            return self::FAILURE;
        }

        // ── 3. Frontend/backend key agreement ──
        $frontendEnv = base_path('../frontend/.env');
        if (is_file($frontendEnv)) {
            $fe = $this->parseDotEnv($frontendEnv);
            $feKey = trim((string) ($fe['VITE_REVERB_APP_KEY'] ?? ''), "\"'");
            $fePort = trim((string) ($fe['VITE_REVERB_PORT'] ?? ''), "\"'");
            $feHost = trim((string) ($fe['VITE_REVERB_HOST'] ?? ''), "\"'");
            $feScheme = strtolower(trim((string) ($fe['VITE_REVERB_SCHEME'] ?? ''), "\"'"));

            $this->components->twoColumnDetail('Frontend .env found', 'yes');

            $mismatch = [];
            if ($feKey !== $backendKey) {
                $mismatch[] = "app key (backend '{$backendKey}' vs frontend '{$feKey}')";
            }
            if ($fePort !== '' && (int) $fePort !== $port) {
                $mismatch[] = "port (backend {$port} vs frontend {$fePort})";
            }
            if ($feHost !== '' && $feHost !== 'localhost' && $feHost !== $host) {
                $mismatch[] = "host (backend '{$host}' vs frontend '{$feHost}')";
            }
            if ($feScheme !== '' && $feScheme !== $scheme) {
                $mismatch[] = "scheme (backend {$scheme} vs frontend {$feScheme})";
            }

            if ($mismatch === []) {
                $this->components->twoColumnDetail('Frontend/backend config', 'in sync');
            } else {
                $this->components->twoColumnDetail('Frontend/backend config', 'MISMATCH: '.implode(', ', $mismatch));
                $this->line('  Fix: align the VITE_REVERB_* values in frontend/.env with the REVERB_* values in backend/.env,');
                $this->line('       then restart BOTH the Vite dev server and Reverb (env vars are read at startup).');
            }
        } else {
            $this->components->twoColumnDetail('Frontend .env found', 'no (skipping key comparison)');
        }

        // ── 4. Broadcast delivery (synchronous via ShouldBroadcastNow — no queue worker) ──
        $this->components->twoColumnDetail('Broadcast delivery', 'sync (ShouldBroadcastNow)');

        // ── 5. Raw WebSocket handshake against the live server ──
        $schemeLabel = $scheme === 'https' ? 'wss' : 'ws';
        $this->components->twoColumnDetail('Target', "{$schemeLabel}://{$host}:{$port}/app/{$backendKey}");

        $probe = $this->probe($port);
        if ($probe === null) {
            $this->components->error('Connection refused — nothing is listening on the WebSocket port.');
            $this->line('  Fix: start the WebSocket server in its own terminal:');
            $this->line('');
            $this->line('      php artisan reverb:start --debug');
            $this->line('');
            $this->line('  Then re-run: php artisan websocket:check');

            return self::FAILURE;
        }

        if (str_contains($probe, '101') && str_contains($probe, 'pusher:connection_established')) {
            $this->components->twoColumnDetail('Handshake', 'OK — WebSocket server is UP (101 Switching Protocols)');
            $this->components->info('WebSocket server is healthy.');
            $this->line('  Broadcasts are synchronous (ShouldBroadcastNow) — no queue worker needed.');
            $this->line('  Console in the browser should show: [Echo] WebSocket connected');

            return self::SUCCESS;
        }

        $this->components->error('Server responded, but the handshake failed (unexpected response).');
        $this->line('  Response was: '.substr($probe, 0, 120));
        $this->line('  Fix: restart Reverb with "php artisan reverb:start --debug" and check its logs.');

        return self::FAILURE;
    }

    /**
     * Perform a raw WebSocket upgrade handshake against the Reverb server.
     *
     * @return string|null null when the TCP connection could not be established
     */
    private function probe(int $port): ?string
    {
        $key = (string) config('reverb.apps.apps.0.key', '');

        $fp = @fsockopen('127.0.0.1', $port, $errno, $errstr, 3);
        if ($fp === false) {
            return null;
        }

        $request = 'GET /app/'.$key.'?protocol=7&client=js&version=8.6.0 HTTP/1.1'."\r\n"
            .'Host: localhost:'.$port."\r\n"
            .'Upgrade: websocket'."\r\n"
            .'Connection: Upgrade'."\r\n"
            .'Sec-WebSocket-Key: '.base64_encode(random_bytes(16))."\r\n"
            .'Sec-WebSocket-Version: 13'."\r\n\r\n";

        fwrite($fp, $request);
        $response = (string) fread($fp, 2048);
        fclose($fp);

        return $response;
    }

    /**
     * Minimal .env parser (no dependency on the Dotenv package internals).
     *
     * @return array<string, string>
     */
    private function parseDotEnv(string $path): array
    {
        $values = [];

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || ! str_contains($line, '=')) {
                continue;
            }

            [$k, $v] = explode('=', $line, 2);
            $values[trim($k)] = trim($v);
        }

        return $values;
    }
}