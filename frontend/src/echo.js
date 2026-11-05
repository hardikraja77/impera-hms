
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echo = null;

const SCHEME = (
  import.meta.env.VITE_REVERB_SCHEME || 'https'
).toLowerCase();

const IS_TLS = SCHEME === 'https';

const HOST =
  import.meta.env.VITE_REVERB_HOST ||
  window.location.hostname;

const KEY = import.meta.env.VITE_REVERB_APP_KEY;

const WS_PORT = Number(
  import.meta.env.VITE_REVERB_WS_PORT || 80
);

const WSS_PORT = Number(
  import.meta.env.VITE_REVERB_WSS_PORT || 443
);

const AUTH_ENDPOINT =
  import.meta.env.VITE_REVERB_AUTH_ENDPOINT ||
  '/api/broadcasting/auth';

export function initEcho() {
  const token = localStorage.getItem('token');

  if (!token) {
    console.warn('[Echo] No authentication token found.');
    return null;
  }

  if (echo) return echo;

  if (!KEY || !HOST) {
    console.error('[Echo] Missing configuration.');
    return null;
  }

  console.info('[Echo] Initializing:', {
    host: HOST,
    wsPort: WS_PORT,
    wssPort: WSS_PORT,
    forceTLS: IS_TLS,
  });

  echo = new Echo({
    broadcaster: 'reverb',
    key: KEY,

    wsHost: HOST,
    wsPort: WS_PORT,
    wssPort: WSS_PORT,

    forceTLS: IS_TLS,

    enabledTransports: ['ws', 'wss'],

    activityTimeout: 30000,
    pongTimeout: 30000,
    unavailableTimeout: 10000,

    authEndpoint: AUTH_ENDPOINT,

    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  window.echo = echo;

  const connection = echo.connector.pusher.connection;

  connection.bind('state_change', (states) => {
    console.log(
      '[Echo] State:',
      states.previous,
      '->',
      states.current
    );
  });

  connection.bind('connected', () => {
    console.log('[Echo] Connected successfully!');

    console.log(
      '[Echo] Socket ID:',
      connection.socket_id
    );
  });

  connection.bind('error', (error) => {
    console.error('[Echo] Connection error:', error);
  });

  connection.bind('failed', () => {
    console.error('[Echo] Connection failed.');
  });

  connection.bind('unavailable', () => {
    console.error('[Echo] Connection unavailable.');
  });

  connection.bind('disconnected', () => {
    console.warn('[Echo] Disconnected.');
  });

  return echo;
}

export function getEcho() {
  return echo;
}

export function disconnectEcho() {
  if (echo) {
    echo.disconnect();
    echo = null;
    console.log('[Echo] Disconnected.');
  }
}

export function subscribePrivate(channelName, event, callback) {
  const instance = initEcho();

  if (!instance) return null;

  return instance
    .private(channelName)
    .listen(event, callback);
}

export default echo;
