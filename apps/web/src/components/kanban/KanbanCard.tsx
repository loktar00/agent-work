import { Group, Text, Stack, Progress } from '@mantine/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card as CardType, Subtask } from '@agent-board/shared';
import { AgentBadge } from '../AgentBadge';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';
import { TimeAgo } from '../TimeAgo';
import classes from './KanbanCard.module.css';

interface KanbanCardProps {
  card: CardType;
  agentName?: string;
  subtasks?: Subtask[];
  onClick?: () => void;
  activeRunId?: string;
  onPulseClick?: (runId: string) => void;
}

export function KanbanCard({ card, agentName, subtasks, onClick, activeRunId, onPulseClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: 'card', card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const completedCount = subtasks?.filter((s) => s.completed).length ?? 0;
  const totalCount = subtasks?.length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`${classes.card}${activeRunId ? ` ${classes.pulse}` : ''}`}
      data-testid={`card-${card.id}`}
    >
      {activeRunId && (
        <div
          className={classes.pulseIndicator}
          onClick={(e) => {
            e.stopPropagation();
            onPulseClick?.(activeRunId);
          }}
          title="Agent working — click to view"
        />
      )}
      <Stack gap="xs">
        <Text size="sm" fw={500} lineClamp={2}>
          {card.title}
        </Text>

        <Group gap="xs" wrap="wrap">
          <StatusBadge status={card.status} />
          <PriorityBadge priority={card.priority} />
          {agentName && <AgentBadge name={agentName} />}
        </Group>

        {totalCount > 0 && (
          <Group gap="xs" align="center">
            <Progress
              value={(completedCount / totalCount) * 100}
              size="xs"
              color="green"
              style={{ flex: 1 }}
            />
            <Text size="xs" c="dimmed">
              {completedCount}/{totalCount}
            </Text>
          </Group>
        )}

        <TimeAgo date={card.updatedAt} />
      </Stack>
    </div>
  );
}
