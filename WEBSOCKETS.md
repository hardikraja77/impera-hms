# WebSockets in this HMS (Laravel Reverb + React Echo)

This document is the complete reference for the real-time layer: why it broke
(`net::ERR_CONNECTION_REFUSED` on `ws://localhost:8080`), how to run it, how it
replaced polling, and how to run it in production.

> **TL;DR — if you see the infinite `reconnecting…` loop right now:**
>
> ```bash
> cd backend
> php artisan reverb:start --debug   # terminal 2 — the WebSocket server
> ```
>
> Broadcasts are synchronous (`ShouldBroadcastNow`) — **no queue worker needed**.
>
> then verify in one command:
>
> ```bash
> php artisan websocket:check       # prints PASS/FAIL + the exact fix
> ```
>
> The reconnect loop is the **symptom**, not the bug: pusher-js retries forever
> until the server is up, so as soon as `reverb:start` is running the next
> retry succeeds (no page reload needed).
>
> **TL;DR — if you see `POST /api/broadcasting/auth 403 (Forbidden)` in the
> Network tab while the socket says it is connected:** the socket is fine;
> a **private-channel subscription** was rejected. That is a separate layer
> from the WebSocket connection, and it is what stops events from ever
> reaching the dashboards. Fixed in this repo (`routes/channels.php`):
>
> 1. Channel callbacks now resolve the **Bearer-token user via the `sanctum`
>    guard** (`['guards' => ['sanctum']]`) — otherwise every subscription
>    denies for API-token users.
> 2. Literal shared channels are registered **before** per-user wildcards,
>    and wildcard callbacks return `null` (keep looking) for non-numeric
>    segments. `receptionist.dashboard` used to be swallowed by
>    `receptionist.{receptionistId}` (the `{receptionistId}` placeholder
>    happily matched the literal segment `dashboard`), so **every receptionist
>    got a 403** on that subscription while the socket stayed “connected”.
>
> See §1b for the full analysis and §7-F for the one-curl verification.

---

## 1. Root cause analysis

The error you saw:

```
WebSocket connection failed: net::ERR_CONNECTION_REFUSED
ws://localhost:8080/app/xxxxx
wss://localhost:8080/app/xxxxx
```

`ERR_CONNECTION_REFUSED` is a **TCP-level** error: the browser opened a socket to
`localhost:8080` and **nothing was listening there**. It is *not* a config
mismatch, a CORS error, or a frontend bug. It means the WebSocket server process
(Reverb) was not running.

Verification performed on this repo:

| Check | Result |
|---|---|
| `php artisan reverb:start` | Starts, logs `Starting server on 0.0.0.0:8080` |
| Raw WebSocket handshake to `ws://localhost:8080/app/{key}` | `101 Switching Protocols` + `pusher:connection_established` |
| `REVERB_APP_KEY` (backend `.env`) vs `VITE_REVERB_APP_KEY` (frontend `.env`) | Match |
| `REVERB_PORT` / `REVERB_SCHEME` on both sides | `8080` / `http`, match |
| `BROADCAST_CONNECTION` | `reverb` |
| `php artisan websocket:check` | Reports handshake PASS/FAIL against the live server |

**Why `localhost:8080`?** That is Reverb's default port (`config/reverb.php`,
`REVERB_SERVER_PORT`). The client connects directly to the WebSocket port — it is
*not* proxied through Vite or Laravel. `ws://` is correct for local HTTP; `wss://`
is only correct behind TLS (port 443, see §6).

**Why did you see both `ws://` and `wss://` attempts on the same port?** The old
`echo.js` enabled both transports and pointed `wssPort` at `8080`, so pusher-js
fell back from `ws` to `wss` on a non-TLS port and failed twice. Fixed in
`frontend/src/echo.js` — only the transport matching `VITE_REVERB_SCHEME` is now
enabled.

**Common setup mistakes (and the status of each here):**
- ❌ Reverb server not started → *this was your issue.* `ERR_CONNECTION_REFUSED`
  is a TCP-level error: nothing was listening on `localhost:8080`. The browser
  then retries forever (`reconnecting…`), which is pusher-js's designed
  auto-recovery — the loop disappears the moment the server is running.
- ❌ Frontend key ≠ backend `REVERB_APP_KEY` → verified matching.
- ❌ `wssPort` pointed at the plain `ws` port → fixed (only the transport
  matching `VITE_REVERB_SCHEME` is enabled in `echo.js`).
- ~~Queue worker not running~~ → broadcasts are synchronous
  (`ShouldBroadcastNow`), so no queue worker is required for real-time events.
  The socket connects but events never arrive when the **Reverb server itself**
  is down — that is what the `reconnecting…` loop means.
- ❌ Edited `.env` without restarting → env vars are read at process start.
  Restart `php artisan reverb:start` after backend `.env` changes and restart
  `npm run dev` (or reload the page) after `frontend/.env` changes. Vite bakes
  `VITE_*` values into the served bundle.
- ❌ HTTPS page with `ws://` → a browser blocks plain `ws://` from an `https://`
  page (mixed content). If the app is served over HTTPS, set
  `REVERB_SCHEME=https` / `VITE_REVERB_SCHEME=https` and terminate TLS in front
  of Reverb (§6).

### 1b. The other classic failure: 403 on `/api/broadcasting/auth`

**Symptom:** the console logs `[Echo] WebSocket connected` (or the pill turns
“Live”), but the Network tab shows `POST /api/broadcasting/auth → 403` and
no dashboard ever updates. Dashboards only receive events after they *join* a
private channel, and joining requires this auth request to succeed.

**What happens under the hood:**

1. Echo opens the socket (`ws://localhost:8080/app/{key}`). This needs no auth
   — it is why the socket looks healthy.
2. To subscribe to `private-doctor.1` (or `private-admin.dashboard`,
   `private-receptionist.6`, `private-receptionist.dashboard`), pusher-js
   POSTs `channel_name` + `socket_id` to `/api/broadcasting/auth`.
3. That route lives behind `auth:sanctum` (`routes/api.php`) and runs
   `Broadcast::auth($request)`, which: resolves the user, runs the matching
   `Broadcast::channel(...)` callback from `routes/channels.php`, and returns
   an HMAC `auth` signature for the socket — or throws `403`.

**Two real bugs caused 403s here (both fixed in `routes/channels.php`):**

| # | Bug | Symptom | Fix |
|---|---|---|---|
| 1 | Channel callbacks resolved the user through the request's **default
  (`web`/session) guard**, which never has an identity for Bearer-token API
  requests. Every callback ran with no user → denied. | 403 on *every*
  private channel | `['guards' => ['sanctum']]` as the third argument of each
  `Broadcast::channel(...)` so the Bearer-token user is used. |
| 2 | The wildcard `receptionist.{receptionistId}` matched the literal shared
  channel `receptionist.dashboard` (`{receptionistId}` accepts any
  non-dot segment, including `dashboard`), its callback returned `false`, and
  Laravel throws 403 on the **first** false match — the exact
  `receptionist.dashboard` pattern registered later never ran. | 403 for
  **every receptionist** on the shared dashboard channel | Literal shared
  channels are registered **before** wildcards; wildcard callbacks return
  `null` (keep searching) instead of `false` for non-numeric segments. |

**Rule of thumb for channel patterns:** Laravel authorizes by walking
registered patterns in registration order and stops at the first match
(false ⇒ 403, true ⇒ signed). Literal channel names must therefore be
registered before wildcards that could swallow them.

**One-curl verification** (no browser needed; expects `200` + an `auth` HMAC):

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"email":"<receptionist-email>","password":"<pw>","role":"receptionist"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

curl -s -X POST http://localhost:8000/api/broadcasting/auth \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"channel_name":"private-receptionist.dashboard","socket_id":"1234.5678"}'
# Before the fix: 403 AccessDeniedHttpException
# After the fix:   200 {"auth":"<app-key>:<hmac>"}
```

The full matrix is covered by `backend/tests/Feature/BroadcastAuthTest.php`
(doctor/admin/receptionist grants + cross-role denials).

---

## 2. Correct WebSocket server setup (Laravel)

The stack uses **self-hosted Laravel Reverb** (no external Pusher account needed).
`laravel/reverb` is already in `backend/composer.json`, `config/reverb.php` and
`config/broadcasting.php` are published, and the events in
`backend/app/Events/` implement `ShouldBroadcastNow` (broadcast synchronously
inside the HTTP request — no queue worker involved).

### Required env (backend `.env`)

```dotenv
BROADCAST_CONNECTION=reverb
# QUEUE_CONNECTION no longer matters for broadcasts — events fire
# synchronously via ShouldBroadcastNow, so no queue worker is needed.

REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key    # 20 chars — MUST match VITE_REVERB_APP_KEY
REVERB_APP_SECRET=your-app-secret
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http             # https in production
```

### Start everything (3 terminals)

```bash
# Terminal 1 — Laravel API
php artisan serve --port=8000

# Terminal 2 — WebSocket server (THIS was missing)
php artisan reverb:start --debug

# Terminal 3 — React dev server
cd ../frontend && npm run dev    # http://localhost:5173
```

### Verify it works

1. Reverb terminal shows `Starting server on 0.0.0.0:8080`.
2. `php artisan websocket:check` → `Handshake … OK — WebSocket server is UP`.
3. Browser DevTools → Console after login shows `[Echo] WebSocket connected`
   (added in `frontend/src/echo.js`).
4. Register a patient as a receptionist → the doctor's and admin's dashboards
   update without a refresh.
5. Raw handshake check (no client needed; `websocket:check` wraps this):

```bash
php -r '
$env = file(".env"); $key = "";
foreach ($env as $l) if (preg_match("/^REVERB_APP_KEY=(.+)$/", trim($l), $m)) { $key = trim($m[1], "\"\x27"); break; }
$fp = fsockopen("127.0.0.1", 8080, $e, $s, 3);
$r  = "GET /app/{$key}?protocol=7&client=js&version=8.6.0 HTTP/1.1\r\n"
    . "Host: localhost:8080\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
    . "Sec-WebSocket-Key: " . base64_encode(random_bytes(16)) . "\r\nSec-WebSocket-Version: 13\r\n\r\n";
fwrite($fp, $r); echo fread($fp, 512); fclose($fp);
'
# Expect: HTTP/1.1 101 Switching Protocols ... "pusher:connection_established"
```

> **Port rules:** keep Reverb on **8080** locally. Do *not* move the WebSocket to
> 80/443 in dev. In production, put Reverb **behind** the web server (nginx/Caddy)
> and terminate TLS there (§6). The client never talks to the PHP-FPM port for
> WebSockets.

---

## 3. Frontend setup (React)

`laravel-echo` + `pusher-js` are already in `frontend/package.json`. All
connection logic lives in `frontend/src/echo.js` (single Echo instance, cached;
auto-connects when a token exists; disconnects on logout).

Required env (`frontend/.env`):

```dotenv
VITE_REVERB_APP_KEY=your-app-key        # MUST equal backend REVERB_APP_KEY
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http                 # https in production
# Optional:
# VITE_REVERB_WSS_PORT=443              # prod: wss port behind TLS terminator
# VITE_REVERB_AUTH_ENDPOINT=https://api.example.com/api/broadcasting/auth  # cross-origin only
```

What `echo.js` does correctly now:
- `broadcaster: 'reverb'` (no Pusher account required).
- `wsHost` defaults to `window.location.hostname` so it works over LAN/devices.
- `wsPort` (8080) and `wssPort` (443) are separate; only the transport matching
  `VITE_REVERB_SCHEME` is enabled — no more ws→wss double-failure noise.
- `authEndpoint: '/api/broadcasting/auth'` — Laravel route in
  `backend/routes/api.php` (behind `auth:sanctum`); Vite proxies `/api` to
  `:8000` in dev, same-origin in prod.
- Bearer token attached to channel-authorization requests.

Subscriptions use `frontend/src/hooks/useEcho.js` (`useEchoChannel`): subscribes
once per channel, keeps the latest callback in a ref (no resubscribe churn), and
cleans up per-event listeners on unmount. `useEchoConnection` (mounted once in
`App.jsx` via `EchoInitializer`) connects on login and disconnects on logout.

---

## 4. Polling replaced — what to look for

The old code polled with `setInterval` on API endpoints. It is gone:

- **`setInterval` count in `frontend/src`:** 0.
- Every dashboard loads data **once on mount/tab change**, then mutates local
  state directly from WebSocket payloads:
  - `DoctorDashboard.jsx` — `fetchData()` on mount only; comment
    `"live updates arrive via WebSocket, no polling"`.
  - `ReceptionistDashboard.jsx` — schedule loads on tab open; Echo subscriptions
    update patients and doctor availability.
  - `AdminDashboard.jsx` — analytics fetch on filter change; Echo handlers bump
    stat cards, status distribution, daily stats, and revenue from event payloads
    (`bumpDistribution`, `bumpDailyStats`).
- Remaining `setTimeout` calls are UX only (auto-hide success toasts, lookup
  debounce) — not polling.

Rule of thumb: **fetch on demand (page open, tab switch, filter change) +
broadcast mutations.** Keep REST for initial data and write operations; use
WebSockets for "something changed elsewhere" notifications.

---

## 5. Real-time use cases (implemented)

| Use case | Event (`backend/app/Events/`) | Channels | Listener |
|---|---|---|---|
| Patient registration | `PatientCreated` (`patient.created`) | `doctor.{id}`, `admin.dashboard`, `receptionist.{id}` | Doctor enquiry list + toast; admin stats; receptionist created-patient list |
| Doctor availability | `DoctorAvailabilityChanged` (`doctor.availability.changed`) | `admin.dashboard`, `receptionist.dashboard` | Admin doctor table; receptionist schedule (available/busy) |
| Appointment / consultation booking | `ConsultationUpdated` (`consultation.updated`) | `doctor.{id}`, `admin.dashboard`, `receptionist.{id}` | Doctor list movement, admin revenue + status charts, receptionist schedule |
| Patient status flow | `PatientStatusUpdated` (`patient.status.updated`) | `doctor.{id}`, `admin.dashboard`, `receptionist.{id}` | Moves patients between pending/consulted/completed everywhere |
| Admin live stats | same events above | `admin.dashboard` | `AdminDashboard.jsx` increments today's patients, revenue, distribution, daily flow |
| Queue management | Patient statuses (`pending → assigned → consulted → completed`) | all of the above | Each stage change is broadcast; receptionist board and doctor tabs stay in sync |

Channel authorization lives in `backend/routes/channels.php`: every channel is
registered with `['guards' => ['sanctum']]` (this API is Bearer-token
authenticated), and literal shared channels (`admin.dashboard`,
`receptionist.dashboard`) are registered **before** the per-user wildcards so
`receptionist.{receptionistId}` cannot swallow `receptionist.dashboard` (see
§1b). A doctor may only join `doctor.{theirId}`, only admins join
`admin.dashboard`, only receptionists join `receptionist.dashboard` and
`receptionist.{theirId}`.

Event naming: backend uses `broadcastAs('patient.created')`; the frontend listens
with a leading dot — `'.patient.created'` — which is how Laravel Echo maps to the
namespaced event.

---

## 6. Production best practices

**TLS / WSS.** Put Reverb behind nginx/Caddy and terminate TLS there. Point
`REVERB_SCHEME=https`, set `VITE_REVERB_SCHEME=https` and
`VITE_REVERB_WSS_PORT=443` in the frontend. Example nginx location:

```nginx
location /app/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 60s;
}
```

**Reconnection.** pusher-js retries automatically with exponential backoff (Echo
defaults; `activityTimeout`/`pongTimeout` set in `echo.js`). Ensure the token
interceptor in `frontend/src/api.js` redirects to `/` on 401 — on re-login
`useEchoConnection` tears down and rebuilds the socket with the new token.

**Queue handling.** All broadcast events implement `ShouldBroadcastNow`, so they
are delivered synchronously inside the triggering HTTP request — no queue
worker, Horizon, or `jobs` table needed (this app has no other queued work). The
trade-off is that the request waits for the socket write, which is fine at this
app's volume; if you later introduce heavy load or other queued jobs, switch
back to `ShouldBroadcast` and run `php artisan queue:work`.

**Scaling.** Reverb is horizontally scalable: run multiple Reverb servers with
`REVERB_SCALING_ENABLED=true` and a shared Redis for inter-server sync
(`config/reverb.php` → `scaling`). Frontend instances need no changes — the
browser just connects to whichever Reverb node is behind the load balancer
(sticky sessions not required). Use Redis as the queue driver before scaling.

**REST vs WebSockets — when to use which:**
- **REST:** initial page load, list/detail fetches, writes (register patient,
  save consultation, CRUD), anything request/response with no cross-client
  interest.
- **WebSockets:** push notifications of state *changes* to other users (new
  patient → doctor, status change → receptionist/admin), live dashboards, queue
  board. Do not fetch bulk data over the socket; broadcast small deltas and let
  the receiver refetch if it needs full rows (see the `fetchData()` calls inside
  the admin/doctor Echo handlers).

---

## 7. Step-by-step debug checklist

Work top to bottom — each step tells you whether to continue or stop.

### A. Is the WebSocket server running? (90% of the time this is the answer)

```bash
cd backend
php artisan websocket:check
```

- **`Handshake … OK`** → server is up, jump to **B**.
- **`Connection refused`** → nothing listens on `:8080`. Run
  `php artisan reverb:start --debug` in a terminal you keep open, then re-run
  the check.

### B. Did the browser actually connect?

1. Log in to the app, open DevTools → Console.
2. Expect `[Echo] WebSocket connected`. The sidebar/header pill turns **green
   “Live”**.
3. Still `reconnecting…`? Check the Network/Console message for the exact URL
   it tries (e.g. `ws://localhost:8080/app/{key}`):
   - Port ≠ `8080` or host ≠ `localhost` → fix `VITE_REVERB_HOST`/
     `VITE_REVERB_PORT` in `frontend/.env` and **restart `npm run dev`**.
   - `wss://` on port `8080` → `VITE_REVERB_SCHEME` is `https` but the server
     is plain HTTP; set it back to `http` (or put TLS in front, §6).
   - URL shows `app/undefined` → `VITE_REVERB_APP_KEY` is empty; set it to the
     same value as backend `REVERB_APP_KEY`.

### C. Are the keys in sync?

```bash
php artisan websocket:check    # prints “in sync” or the exact mismatch
```

Backend `REVERB_APP_KEY` must equal frontend `VITE_REVERB_APP_KEY`
(here: `qxfklimpham0kcsgwhj4`). After changing either, restart both Reverb and
Vite — keys are read once at process start.

### D. Socket is connected but events never arrive?

1. Broadcasts are synchronous (`ShouldBroadcastNow`), so there is no queue
   worker to check. Trigger the action and watch the Reverb terminal — a
   broadcast appears there instantly.
2. Did the event fire? Check the action actually calls `broadcast(...)` — see
   `backend/app/Http/Controllers/Api/` (`ReceptionistController`, `DoctorController`).
3. Is the listener on the right channel with a leading-dot event name?
   Channel auth is enforced in `backend/routes/channels.php`; the frontend must
   use the exact channel (`'doctor.1'`, `'admin.dashboard'`, …) and
   `'.patient.created'`-style names. A failed private-channel auth shows as a
   `403` on `/api/broadcasting/auth` in the Network tab.
4. Restart Reverb after backend changes: `php artisan reverb:restart` (or
   restart the terminal running `reverb:start`).

### E. Still stuck? End-to-end probe without the browser

```bash
cd backend
php artisan tinker --execute="broadcast(new \App\Events\DoctorAvailabilityChanged(\App\Models\Doctor::first(), 'available'))"
```

With Reverb running, this pushes a real broadcast through the whole pipeline
synchronously; any admin dashboard listening on `admin.dashboard` should
update. If it does, the stack is healthy and the issue is on the triggering
side.

### F. `/broadcasting/auth` returns 403 while the socket is connected?

The socket and the subscription are different layers: a 403 here means the
private channel was **denied**, so no events will arrive even though the
socket shows connected. Diagnose with the role/channel matrix:

```bash
# as a receptionist — these two are the ones that used to fail
curl ... -d '{"channel_name":"private-receptionist.dashboard","socket_id":"1.2"}'   # expect 200
curl ... -d '{"channel_name":"private-receptionist.6","socket_id":"1.2"}'          # expect 200
# cross-role attempts must stay 403
curl ... -d '{"channel_name":"private-admin.dashboard","socket_id":"1.2"}'          # expect 403
```

Full example in §1b. If every channel 403s, check that `routes/channels.php`
still passes `['guards' => ['sanctum']]` (the app authenticates with Bearer
tokens, not sessions). If only one channel 403s, check pattern order: literal
names must be registered before wildcards. Regression coverage lives in
`backend/tests/Feature/BroadcastAuthTest.php`.

### Cheat sheet: which process runs what

| Process | Command | Port | Missing symptom |
|---|---|---|---|
| Laravel API | `php artisan serve --port=8000` | 8000 | API calls fail |
| WebSocket server | `php artisan reverb:start --debug` | 8080 | `reconnecting…` loop, `ERR_CONNECTION_REFUSED` |
| React dev server | `cd frontend && npm run dev` | 5173 | page won't load |