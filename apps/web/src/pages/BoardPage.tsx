import { Container, Loader, Center } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { useBoard } from '../api/hooks/useBoards';
import { useColumns } from '../api/hooks/useColumns';
import { useCards, useMoveCard } from '../api/hooks/useCards';
import { useAgents } from '../api/hooks/useAgents';
import { useBoardSSE } from '../hooks/useBoardSSE';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { CardDetailDrawer } from '../components/card/CardDetailDrawer';
import { useUIStore } from '../stores/uiStore';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type { Column, Card, Agent } from '@agent-board/shared';

export default function BoardPage() {
  const { boardId, cardId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: board, isLoading: boardLoading } = useBoard(boardId ?? '');
  const { data: columns = [] } = useColumns(boardId ?? '') as { data: Column[] };
  const { data: cards = [] } = useCards(boardId ?? '') as { data: Card[] };
  const { data: agents = [] } = useAgents() as { data: Agent[] };
  const moveCard = useMoveCard(boardId ?? '');

  useBoardSSE(boardId);

  const activeCardId = cardId ?? useUIStore((s) => s.activeCardId);
  const setActiveCard = useUIStore((s) => s.setActiveCard);

  const activeCard = cards.find((c) => c.id === activeCardId) ?? null;

  const agentNames: Record<string, string> = {};
  for (const agent of agents) {
    agentNames[agent.id] = agent.name;
  }

  const handleCardMove = useCallback(
    (cardId: string, columnId: string, position: number) => {
      moveCard.mutate({ cardId, columnId, position });
    },
    [moveCard],
  );

  const handleCardClick = useCallback(
    (id: string) => {
      if (boardId) {
        navigate(`/boards/${boardId}/cards/${id}`);
      }
    },
    [boardId, navigate],
  );

  const handleCloseDrawer = useCallback(() => {
    setActiveCard(null);
    if (boardId) navigate(`/boards/${boardId}`);
  }, [boardId, navigate, setActiveCard]);

  if (boardLoading) {
    return (
      <Center h="80vh">
        <Loader color="pink" type="dots" />
      </Center>
    );
  }

  return (
    <Container fluid h="calc(100vh - 100px)">
      <KanbanBoard
        columns={columns}
        cards={cards}
        agentNames={agentNames}
        onCardMove={handleCardMove}
        onCardClick={handleCardClick}
      />

      <CardDetailDrawer
        card={activeCard}
        agents={agents}
        opened={!!activeCardId}
        onClose={handleCloseDrawer}
        onUpdateTitle={(title) => {
          if (activeCardId) {
            api.patch(`/api/cards/${activeCardId}`, { title }).then(() =>
              qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId!) }),
            );
          }
        }}
        onUpdateStatus={(status) => {
          if (activeCardId) {
            api.patch(`/api/cards/${activeCardId}`, { status }).then(() =>
              qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId!) }),
            );
          }
        }}
        onUpdateAssignee={(agentId) => {
          if (activeCardId) {
            api
              .patch(`/api/cards/${activeCardId}`, { assigneeAgentId: agentId })
              .then(() =>
                qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId!) }),
              );
          }
        }}
      />
    </Container>
  );
}
