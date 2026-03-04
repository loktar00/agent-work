import { Paper, Group, Text, Stack, Badge, ScrollArea } from '@mantine/core';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column, Card as CardType, Subtask } from '@agent-board/shared';
import { KanbanCard } from './KanbanCard';
import { AgentBadge } from '../AgentBadge';
import classes from './KanbanColumn.module.css';

const COLUMN_COLORS = [
  '#00fff2',
  '#ff00aa',
  '#e0ff00',
  '#00a8ff',
  '#ff2d78',
  '#aa00ff',
];

interface KanbanColumnProps {
  column: Column;
  cards: CardType[];
  agentNames: Record<string, string>;
  subtasksByCard?: Record<string, Subtask[]>;
  onCardClick?: (cardId: string) => void;
  onAddCard?: (columnId: string) => void;
}

export function KanbanColumn({
  column,
  cards,
  agentNames,
  subtasksByCard,
  onCardClick,
  onAddCard,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const isOverWip = column.wipLimit != null && cards.length >= column.wipLimit;
  const barColor = COLUMN_COLORS[column.position % COLUMN_COLORS.length];

  return (
    <Paper
      p="sm"
      miw={280}
      maw={320}
      h="100%"
      className={classes.column}
      data-testid={`column-${column.id}`}
      style={{
        borderColor: isOver ? 'var(--mantine-color-pink-5)' : undefined,
        flexShrink: 0,
      }}
    >
      <div className={classes.statusBar} style={{ backgroundColor: barColor }} />
      <Stack gap="xs" h="100%" pl="xs">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={600} truncate className={classes.columnHeader}>
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

        {onAddCard && (
          <button
            data-testid={`add-card-${column.id}`}
            onClick={() => onAddCard(column.id)}
            style={{
              background: 'transparent',
              border: '1px dashed #333',
              borderRadius: 6,
              padding: '8px 12px',
              color: '#555',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00fff2';
              e.currentTarget.style.color = '#00fff2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#333';
              e.currentTarget.style.color = '#555';
            }}
          >
            + Add Card
          </button>
        )}
      </Stack>
    </Paper>
  );
}
