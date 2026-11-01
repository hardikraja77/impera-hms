import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally for Echo
window.Pusher = Pusher;

let echo = null;

const SCHEME = (import.meta.env.VITE_REVERB_SCHEME || 'http').toLowerCase();

/**
 * Initialize Laravel Echo connection (Laravel Reverb broadcaster).
 * Only connects when a valid token exists (user is authenticated).
 *
 * Dev default:  ws://localhost:8080/app/{key}   (VITE_REVERB_SCHEME=http)
 * Prod default: wss://your-domain/app/{key}     (VITE_REVERB_SCHEME=https, port 443)
 *
 * Only the transport matching VITE_REVERB_SCHEME is enabled, so the client
 * never falls back to wss:// on the plain ws port (which is what produced
 * the "WebSocket connection failed: net::ERR_CONNECTION_REFUSED" noise).
 */
export function initEcho() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (echo) return echo;

  const isTLS = SCHEME === 'https';

  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname || 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    wssPort: import.meta.env.VITE_REVERB_WSS_PORT || 443,
    forceTLS: isTLS,
    // Enable only the transport for the configured scheme — avoids a failing
    // ws -> wss fallback attempt on a non-TLS server (or vice versa).
    enabledTransports: isTLS ? ['wss'] : ['ws'],
    // Reverb keeps connections alive; pusher-js retries automatically on drop.
    activityTimeout: 30000,
    pongTimeout: 30000,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
    // Same-origin in dev (Vite proxies /api to Laravel) and in a same-origin
    // production deployment. Set VITE_REVERB_AUTH_ENDPOINT to override for
    // cross-origin setups, e.g. https://api.example.com/api/broadcasting/auth
    authEndpoint: import.meta.env.VITE_REVERB_AUTH_ENDPOINT || '/api/broadcasting/auth',
  });

  // Surface the connection lifecycle in the console for easy verification:
  //   "Pusher : State changed, new state: connected" = WebSocket is live.
  echo.connector.pusher.connection.bind('connected', () => {
    console.info('[Echo] WebSocket connected');
  });
  echo.connector.pusher.connection.bind('error', (err) => {
    console.error('[Echo] WebSocket error:', err);
  });

  return echo;
}

/**
 * Get the Echo instance
 */
export function getEcho() {
  return echo;
}

/**
 * Disconnect Echo and clean up
 */
export function disconnectEcho() {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
}

/**
 * Subscribe to a private channel
 */
export function subscribePrivate(channelName, event, callback) {
  const e = initEcho();
  if (!e) return null;

  return e.private(channelName).listen(event, callback);
}

export default echo;