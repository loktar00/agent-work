import { Text, Stack, Group } from '@mantine/core';
import type { Card as CardType } from '@agent-board/shared';
import { StatusBadge } from '../StatusBadge';

interface KanbanCardDragOverlayProps {
  card: CardType;
}

export function KanbanCardDragOverlay({ card }: KanbanCardDragOverlayProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.95), rgba(15, 15, 25, 0.98))',
        border: '1px solid #00fff2',
        borderRadius: 4,
        padding: '1rem',
        cursor: 'grabbing',
        transform: 'rotate(3deg) scale(1.02)',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 242, 0.2)',
        opacity: 0.9,
      }}
    >
      <Stack gap="xs">
        <Text size="sm" fw={500} lineClamp={2}>
          {card.title}
        </Text>
        <Group gap="xs">
          <StatusBadge status={card.status} />
        </Group>
      </Stack>
    </div>
  );
}
