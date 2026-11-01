import { useEchoStatus } from '../hooks/useEcho';
import { STATUS_META } from './statusMeta';

const DOT_CLASSES = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-500',
};

const TEXT_CLASSES = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  slate: 'text-slate-400',
};

/**
 * Live WebSocket status pill for the dashboard headers.
 * Replaces the old static "Live Sync / Real-time · WebSocket" badge with the
 * actual pusher connection state (auto-refreshing, no polling).
 */
export default function ConnectionStatus() {
  const status = useEchoStatus();
  const meta = STATUS_META[status] || STATUS_META.idle;
  const dot = DOT_CLASSES[meta.color];

  return (
    <div className="bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm flex items-center gap-3">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {meta.color !== 'slate' && (
          <span className={`animate-ping absolute inline-flex h-full w-full ${dot} opacity-75 rounded-full`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dot}`} />
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">Live Sync</p>
        <p className={`font-bold text-xs mt-1 ${TEXT_CLASSES[meta.color]}`}>{meta.label}</p>
      </div>
    </div>
  );
}