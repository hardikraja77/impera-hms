import { useEffect, useRef } from 'react';
import { initEcho, disconnectEcho } from '../echo';
import { useAuth } from '../context/AuthContext';

/**
 * React hook to subscribe to a private Echo channel.
 * Automatically connects on mount and disconnects on unmount.
 *
 * @param {string} channel - The private channel name (e.g., 'doctor.1')
 * @param {string} event - The event name to listen for (e.g., '.patient.created')
 * @param {function} callback - Handler for the event data
 */
export function useEchoChannel(channel, event, callback) {
  const { user } = useAuth();
  const listenerRef = useRef(null);

  useEffect(() => {
    if (!user || !channel || !event) return;

    const echo = initEcho();
    if (!echo) return;

    try {
      const listener = echo.private(channel).listen(event, callback);
      listenerRef.current = listener;
    } catch (err) {
      console.error(`[Echo] Failed to subscribe to ${channel}:${event}`, err);
    }

    return () => {
      if (listenerRef.current) {
        try {
          echo.private(channel).stopListening(event);
        } catch {
          // ignore cleanup errors
        }
        listenerRef.current = null;
      }
    };
  }, [user, channel, event, callback]);

  return listenerRef;
}

/**
 * React hook to connect/disconnect Echo based on auth state
 */
export function useEchoConnection() {
  const { user, tokenExpiresAt } = useAuth();

  useEffect(() => {
    if (user) {
      initEcho();
    }

    return () => {
      disconnectEcho();
    };
  }, [user, tokenExpiresAt]);
}

export default useEchoChannel;
