import { Badge, type BadgeProps } from '@mantine/core';
import type { CardStatus } from '@agent-board/shared';

const statusColors: Record<CardStatus, string> = {
  backlog: 'gray',
  todo: 'blue',
  in_progress: 'yellow',
  in_review: 'violet',
  done: 'green',
  archived: 'dark',
};

const statusLabels: Record<CardStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  archived: 'Archived',
};

interface StatusBadgeProps extends Omit<BadgeProps, 'children'> {
  status: CardStatus;
}

export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  return (
    <Badge color={statusColors[status]} variant="light" size="sm" {...props}>
      {statusLabels[status]}
    </Badge>
  );
}
