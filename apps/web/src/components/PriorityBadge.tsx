import { Badge } from '@mantine/core';
import type { CardPriority } from '@agent-board/shared';

const priorityColors: Record<string, { color: string; label: string }> = {
  critical: { color: '#ff00aa', label: 'Critical' },
  high: { color: '#ff2d78', label: 'High' },
  medium: { color: '#e0ff00', label: 'Medium' },
  low: { color: '#00a8ff', label: 'Low' },
};

export function PriorityBadge({ priority }: { priority: CardPriority }) {
  const config = priorityColors[priority] ?? priorityColors.medium;
  return (
    <Badge
      size="xs"
      style={{
        backgroundColor: config.color + '22',
        color: config.color,
        border: `1px solid ${config.color}44`,
      }}
    >
      {config.label}
    </Badge>
  );
}
