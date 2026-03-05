import { Group, Text, Badge, Menu, ActionIcon } from '@mantine/core';
import { IconDots, IconPencil, IconTrash } from '@tabler/icons-react';
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
  activeRunByCard?: Record<string, string>;
  onCardClick?: (cardId: string) => void;
  onAddCard?: (columnId: string) => void;
  onRunClick?: (runId: string) => void;
  onEditColumn?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
}

export function KanbanColumn({
  column,
  cards,
  agentNames,
  subtasksByCard,
  activeRunByCard,
  onCardClick,
  onAddCard,
  onRunClick,
  onEditColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const isOverWip = column.wipLimit != null && cards.length >= column.wipLimit;
  const barColor = COLUMN_COLORS[column.position % COLUMN_COLORS.length];

  return (
    <div
      className={classes.column}
      data-testid={`column-${column.id}`}
      style={{
        borderColor: isOver ? 'var(--neon-cyan, #00fff2)' : undefined,
        boxShadow: isOver
          ? '0 0 40px rgba(0, 255, 242, 0.3), inset 0 0 20px rgba(0, 255, 242, 0.05)'
          : undefined,
      }}
    >
      <div className={classes.statusBar} style={{ backgroundColor: barColor }} />

      <div className={classes.columnHeaderRow}>
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={700} truncate className={classes.columnTitle}>
            {column.name}
          </Text>
          <span className={classes.cardCount}>
            {cards.length}
          </span>
        </Group>
        <Group gap="xs" wrap="nowrap">
          {column.agentId && agentNames[column.agentId] && (
            <AgentBadge name={agentNames[column.agentId]} />
          )}
          {isOverWip && (
            <Badge size="xs" color="red" variant="filled">
              WIP
            </Badge>
          )}
          {(onEditColumn || onDeleteColumn) && (
            <Menu shadow="md" width={160} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" size="xs" color="gray">
                  <IconDots size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {onEditColumn && (
                  <Menu.Item
                    leftSection={<IconPencil size={14} />}
                    onClick={() => onEditColumn(column.id)}
                  >
                    Edit Column
                  </Menu.Item>
                )}
                {onDeleteColumn && (
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    onClick={() => onDeleteColumn(column.id)}
                  >
                    Delete Column
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </div>

      <div className={classes.cardsContainer}>
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef} className={classes.cardsList}>
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
                activeRunId={activeRunByCard?.[card.id]}
                onClick={() => onCardClick?.(card.id)}
                onPulseClick={onRunClick}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {onAddCard && (
        <button
          className={classes.addCardBtn}
          data-testid={`add-card-${column.id}`}
          onClick={() => onAddCard(column.id)}
        >
          + ADD TASK
        </button>
      )}
    </div>
  );
}
