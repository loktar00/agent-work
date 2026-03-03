import { Card, Group, Text, Stack, Progress } from '@mantine/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card as CardType, Subtask } from '@agent-board/shared';
import { AgentBadge } from '../AgentBadge';
import { StatusBadge } from '../StatusBadge';
import { TimeAgo } from '../TimeAgo';

interface KanbanCardProps {
  card: CardType;
  agentName?: string;
  subtasks?: Subtask[];
  onClick?: () => void;
}

export function KanbanCard({ card, agentName, subtasks, onClick }: KanbanCardProps) {
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
    cursor: 'grab',
  };

  const completedCount = subtasks?.filter((s) => s.completed).length ?? 0;
  const totalCount = subtasks?.length ?? 0;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      p="sm"
      onClick={onClick}
      withBorder
    >
      <Stack gap="xs">
        <Text size="sm" fw={500} lineClamp={2}>
          {card.title}
        </Text>

        <Group gap="xs" wrap="wrap">
          <StatusBadge status={card.status} />
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
    </Card>
  );
}
