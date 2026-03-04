import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Column, Card as CardType, Subtask } from '@agent-board/shared';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardDragOverlay } from './KanbanCardDragOverlay';
import classes from './KanbanBoard.module.css';

interface KanbanBoardProps {
  columns: Column[];
  cards: CardType[];
  agentNames: Record<string, string>;
  subtasksByCard?: Record<string, Subtask[]>;
  onCardMove: (cardId: string, columnId: string, position: number) => void;
  onCardClick?: (cardId: string) => void;
  onAddCard?: (columnId: string) => void;
  onAddColumn?: () => void;
}

export function KanbanBoard({
  columns,
  cards,
  agentNames,
  subtasksByCard,
  onCardMove,
  onCardClick,
  onAddCard,
  onAddColumn,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<CardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const cardsByColumn = useCallback(
    (columnId: string) =>
      cards
        .filter((c) => c.columnId === columnId)
        .sort((a, b) => a.position - b.position),
    [cards],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = cards.find((c) => c.id === event.active.id);
      if (card) setActiveCard(card);
    },
    [cards],
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Placeholder for future cross-column drag preview
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCard(null);
      const { active, over } = event;
      if (!over) return;

      const cardId = active.id as string;
      const overData = over.data.current;

      let targetColumnId: string;
      let targetPosition: number;

      if (overData?.type === 'column') {
        targetColumnId = over.id as string;
        targetPosition = cardsByColumn(targetColumnId).length;
      } else if (overData?.type === 'card') {
        const overCard = overData.card as CardType;
        targetColumnId = overCard.columnId;
        const colCards = cardsByColumn(targetColumnId);
        const overIndex = colCards.findIndex((c) => c.id === overCard.id);
        targetPosition = overIndex >= 0 ? overIndex : colCards.length;
      } else {
        return;
      }

      onCardMove(cardId, targetColumnId, targetPosition);
    },
    [onCardMove, cardsByColumn],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={classes.boardContainer}>
        {columns
          .sort((a, b) => a.position - b.position)
          .map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cardsByColumn(column.id)}
              agentNames={agentNames}
              subtasksByCard={subtasksByCard}
              onCardClick={onCardClick}
              onAddCard={onAddCard}
            />
          ))}
        {onAddColumn && (
          <button
            className={classes.addColumnBtn}
            data-testid="add-column-btn"
            onClick={onAddColumn}
          >
            + ADD COLUMN
          </button>
        )}
      </div>

      <DragOverlay>
        {activeCard && <KanbanCardDragOverlay card={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
}
