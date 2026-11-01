import { useEffect, useState } from 'react';
import { useEchoStatus } from '../hooks/useEcho';
import { getEcho } from '../echo';

const BAD_STATUSES = new Set(['reconnecting', 'disconnected']);
const SHOW_DELAY_MS = 1500;

/**
 * Floating banner shown whenever the WebSocket connection is stuck
 * (reconnecting / disconnected). Makes the pusher-js retry loop visible and
 * actionable instead of silent: it shows the exact target URL, the fix
 * commands, and a "Retry now" button that forces an immediate reconnect.
 *
 * Rendered once in App.jsx (inside AuthProvider) so it covers every dashboard;
 * it renders nothing on public pages or while the socket is healthy.
 */
export default function WebSocketOfflineBanner() {
  const status = useEchoStatus();
  // 'confirmed' — the bad state persisted long enough to be worth showing.
  const [confirmed, setConfirmed] = useState(false);
  // 'dismissedAt' — the status value at the moment the user dismissed the banner.
  const [dismissedAt, setDismissedAt] = useState(null);

  const isBad = BAD_STATUSES.has(status);

  // Reset once the connection recovers. This is a render-time state adjustment
  // (React's documented pattern for clearing derived state when props change),
  // so no effect is needed.
  if (!isBad && (confirmed || dismissedAt !== null)) {
    setConfirmed(false);
    setDismissedAt(null);
  }

  // Show only after the bad state persists a moment (avoids flashing during
  // brief drops). Dismissal hides the banner until the status changes.
  useEffect(() => {
    if (!isBad || dismissedAt === status) return;
    const t = setTimeout(() => setConfirmed(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [isBad, status, dismissedAt]);

  if (!isBad || !confirmed || dismissedAt === status) return null;

  const isTLS = (import.meta.env.VITE_REVERB_SCHEME || 'http').toLowerCase() === 'https';
  const scheme = isTLS ? 'wss' : 'ws';
  const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname || 'localhost';
  const port = import.meta.env.VITE_REVERB_PORT || 8080;
  const key = import.meta.env.VITE_REVERB_APP_KEY;
  const target = `${scheme}://${host}:${port}/app/${key}`;

  const retryNow = () => {
    try {
      // Force an immediate reconnect attempt on the live pusher instance —
      // otherwise pusher-js waits out its exponential backoff timer.
      getEcho()?.connector?.pusher?.connect();
    } catch {
      // pusher-js keeps auto-retrying regardless; nothing to do here.
    }
  };

  const offline = status === 'disconnected';

  return (
    <div className="fixed top-0 inset-x-0 z-[80] flex justify-center px-4 pt-3 pointer-events-none">
      <div
        aria-live="polite"
        className={`pointer-events-auto w-full max-w-2xl bg-slate-900 border shadow-2xl shadow-black/40 ${
          offline ? 'border-red-500/50' : 'border-amber-500/50'
        }`}
      >
        <div className="flex items-start gap-3 p-4">
          <span className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full opacity-75 rounded-full ${
                offline ? 'bg-red-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                offline ? 'bg-red-500' : 'bg-amber-400'
              }`}
            />
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
              Live updates paused
            </p>
            <p className="font-display text-sm font-bold text-white mt-1">
              {offline ? 'WebSocket connection lost' : 'WebSocket reconnecting…'}
            </p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {offline
                ? 'The real-time connection failed. Ensure the WebSocket server is running, then retry.'
                : 'Auto-retrying in the background. The connection resumes as soon as the server is reachable.'}
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-1.5 break-all">{target}</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Fix: run{' '}
              <span className="text-slate-300 font-mono">php artisan reverb:start</span> and{' '}
              <span className="text-slate-300 font-mono">php artisan queue:work</span> in the backend.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={retryNow}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-teal-600 text-white hover:bg-teal-500 transition-colors"
            >
              Retry now
            </button>
            <button
              onClick={() => setDismissedAt(status)}
              aria-label="Dismiss warning"
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}