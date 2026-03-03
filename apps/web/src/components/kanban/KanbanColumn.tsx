import { Paper, Group, Text, Stack, Badge, ScrollArea } from '@mantine/core';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column, Card as CardType, Subtask } from '@agent-board/shared';
import { KanbanCard } from './KanbanCard';
import { AgentBadge } from '../AgentBadge';

interface KanbanColumnProps {
  column: Column;
  cards: CardType[];
  agentNames: Record<string, string>;
  subtasksByCard?: Record<string, Subtask[]>;
  onCardClick?: (cardId: string) => void;
}

export function KanbanColumn({
  column,
  cards,
  agentNames,
  subtasksByCard,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const isOverWip = column.wipLimit != null && cards.length >= column.wipLimit;

  return (
    <Paper
      p="sm"
      withBorder
      bg="var(--ab-surface-1)"
      miw={280}
      maw={320}
      h="100%"
      style={{
        borderColor: isOver ? 'var(--mantine-color-pink-5)' : undefined,
        flexShrink: 0,
      }}
    >
      <Stack gap="xs" h="100%">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={600} truncate>
              {column.name}
            </Text>
            <Badge size="xs" variant="filled" color="dark">
              {cards.length}
            </Badge>
          </Group>
          <Group gap="xs">
            {column.agentId && agentNames[column.agentId] && (
              <AgentBadge name={agentNames[column.agentId]} />
            )}
            {isOverWip && (
              <Badge size="xs" color="red" variant="filled">
                WIP
              </Badge>
            )}
          </Group>
        </Group>

        <ScrollArea style={{ flex: 1 }} offsetScrollbars>
          <SortableContext
            items={cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack ref={setNodeRef} gap="xs" mih={40}>
              {cards.map((card) => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  agentName={
                    card.assigneeAgentId
                      ? agentNames[card.assigneeAgentId]
                      : undefined
                  }
                  subtasks={subtasksByCard?.[card.id]}
                  onClick={() => onCardClick?.(card.id)}
                />
              ))}
            </Stack>
          </SortableContext>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}
