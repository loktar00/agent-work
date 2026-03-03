import { Card, Text, Stack, Group } from '@mantine/core';
import type { Card as CardType } from '@agent-board/shared';
import { StatusBadge } from '../StatusBadge';

interface KanbanCardDragOverlayProps {
  card: CardType;
}

export function KanbanCardDragOverlay({ card }: KanbanCardDragOverlayProps) {
  return (
    <Card
      p="sm"
      withBorder
      shadow="lg"
      style={{
        cursor: 'grabbing',
        transform: 'rotate(3deg)',
        boxShadow: 'var(--ab-glow-pink)',
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
    </Card>
  );
}
