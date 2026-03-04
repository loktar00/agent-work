import { Badge } from '@mantine/core';
import { useConnectionStore } from '../stores/connectionStore';

const statusConfig = {
  connected: { color: 'green', label: 'Connected' },
  connecting: { color: 'yellow', label: 'Connecting...' },
  disconnected: { color: 'red', label: 'Disconnected' },
} as const;

export function ConnectionIndicator() {
  const status = useConnectionStore((s) => s.status);
  const config = statusConfig[status];

  return (
    <Badge color={config.color} variant="dot" size="sm" data-testid="connection-indicator">
      {config.label}
    </Badge>
  );
}
