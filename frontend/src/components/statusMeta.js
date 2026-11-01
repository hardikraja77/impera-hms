// Single source of truth for connection status labels/colors.
// Consumers map the semantic color to their own theme's Tailwind classes.
export const STATUS_META = {
  connected:    { label: 'Live',           color: 'emerald' },
  connecting:   { label: 'Connecting…',    color: 'amber' },
  reconnecting: { label: 'Reconnecting…',  color: 'amber' },
  disconnected: { label: 'Offline',        color: 'red' },
  idle:         { label: 'Not connected',  color: 'slate' },
};

export default STATUS_META;