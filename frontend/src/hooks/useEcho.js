import { useEffect, useRef, useState } from 'react';
import { initEcho, disconnectEcho } from '../echo';
import { useAuth } from '../context/AuthContext';

/**
 * React hook to subscribe to a private Echo channel.
 * Automatically connects on mount and disconnects on unmount.
 *
 * The listener callback is kept in a ref, so the subscription survives
 * re-renders (and tab switches) without tearing down and re-authorizing
 * the channel every time the callback identity changes.
 *
 * @param {string} channel - The private channel name (e.g., 'doctor.1')
 * @param {string} event - The event name to listen for (e.g., '.patient.created')
 * @param {function} callback - Handler for the event data
 */
export function useEchoChannel(channel, event, callback) {
  const { user } = useAuth();
  const channelRef = useRef(null);
  const callbackRef = useRef(callback);

  // Always keep the latest callback without re-subscribing
  callbackRef.current = callback;

  useEffect(() => {
    if (!user || !channel || !event) return;

    const echo = initEcho();
    if (!echo) return;

    let subscribed = null;
    try {
      subscribed = echo.private(channel);
      // Attach a stable handler that delegates to the latest callback
      subscribed.listen(event, (payload) => callbackRef.current(payload));
      channelRef.current = subscribed;
    } catch (err) {
      console.error(`[Echo] Failed to subscribe to ${channel}:${event}`, err);
    }

    return () => {
      if (subscribed) {
        try {
          // Only remove this event's listener — never unsubscribe the whole
          // channel, since sibling hooks may share it (e.g. doctor.1).
          subscribed.stopListening(event);
        } catch {
          // ignore cleanup errors
        }
        channelRef.current = null;
      }
    };
  }, [user, channel, event]);
}

// pusher-js connection states → normalized status
const CONNECTION_MAP = {
  initialized: 'connecting',
  connecting: 'connecting',
  connected: 'connected',
  unavailable: 'reconnecting', // dropped socket, auto-retry in progress
  failed: 'disconnected',
  disconnected: 'disconnected',
};

/**
 * React hook that exposes the live WebSocket connection status.
 *
 * @returns {'idle'|'connecting'|'connected'|'reconnecting'|'disconnected'}
 *   - idle        no authenticated user (nothing to connect)
 *   - connecting  initial connection / reconnecting after a drop
 *   - connected   WebSocket is live and receiving events
 *   - reconnecting a socket was lost and pusher-js is retrying
 *   - disconnected connection failed terminally
 */
export function useEchoStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!user) {
      setStatus('idle');
      return;
    }

    setStatus('connecting');

    const echo = initEcho();

    if (!echo) {
      console.error('[Echo] Initialization failed. Check authentication token.');
      setStatus('disconnected');
      return;
    }

    const connection = echo.connector.pusher.connection;

    const CONNECTION_MAP = {
      initialized: 'connecting',
      connecting: 'connecting',
      connected: 'connected',
      unavailable: 'reconnecting',
      failed: 'disconnected',
      disconnected: 'disconnected',
    };

    const applyStatus = (state) => {
      const nextStatus = CONNECTION_MAP[state] || 'connecting';
      setStatus(nextStatus);

      console.info(`[Echo] Connection status: ${state}`);
    };

    // Read the current connection state immediately
    applyStatus(connection.state);

    const onStateChange = ({ current }) => {
      applyStatus(current);
    };

    connection.bind('state_change', onStateChange);

    return () => {
      connection.unbind('state_change', onStateChange);
    };
  }, [user]);

  return status;
}

/**
 * React hook to connect/disconnect Echo based on auth state.
 * Connects once the user is authenticated; tears down on logout/unmount.
 */
export function useEchoConnection() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      console.info('[Echo] Initializing connection');
      initEcho();
    } else {
      console.info('[Echo] User logged out. Disconnecting.');
      disconnectEcho();
    }
  }, [user]);
}

export default useEchoChannel;