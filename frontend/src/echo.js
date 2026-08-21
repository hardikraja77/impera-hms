import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally for Echo
window.Pusher = Pusher;

let echo = null;

/**
 * Initialize Laravel Echo connection
 * Only connects when a valid token exists (user is authenticated)
 */
export function initEcho() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (echo) return echo;

  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
    authEndpoint: '/api/broadcasting/auth',
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
