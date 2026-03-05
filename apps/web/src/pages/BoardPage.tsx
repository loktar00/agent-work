import {
  Container,
  Loader,
  Center,
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
  Title,
  Group,
  Anchor,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useBoard } from '../api/hooks/useBoards';
import { useColumns, useCreateColumn } from '../api/hooks/useColumns';
import { useCards, useMoveCard, useCreateCard } from '../api/hooks/useCards';
import { useAgents } from '../api/hooks/useAgents';
import { useActiveRuns } from '../api/hooks/useRuns';
import { useBoardSSE } from '../hooks/useBoardSSE';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { CardDetailDrawer } from '../components/card/CardDetailDrawer';
import { BoardChatDrawer, BoardChatToggle } from '../components/board/BoardChatDrawer';
import { LiveActivityFeed } from '../components/board/LiveActivityFeed';
import { RunLogViewer } from '../components/board/RunLogViewer';
import { useUIStore } from '../stores/uiStore';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type { Column, Card, Agent, Board } from '@agent-board/shared';

export default function BoardPage() {
  const { boardId, cardId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: board, isLoading: boardLoading } = useBoard(boardId ?? '') as { data: Board | undefined; isLoading: boolean };
  const { data: columns = [] } = useColumns(boardId ?? '') as { data: Column[] };
  const { data: cards = [] } = useCards(boardId ?? '') as { data: Card[] };
  const { data: agents = [] } = useAgents() as { data: Agent[] };
  const moveCard = useMoveCard(boardId ?? '');
  const createColumn = useCreateColumn(boardId ?? '');
  const createCard = useCreateCard(boardId ?? '');

  const { data: activeRuns = [] } = useActiveRuns(boardId ?? '');

  useBoardSSE(boardId);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [activityFeedOpen, setActivityFeedOpen] = useState(false);

  const storeActiveCardId = useUIStore((s) => s.activeCardId);
  const setActiveCard = useUIStore((s) => s.setActiveCard);
  const boardChatOpen = useUIStore((s) => s.boardChatOpen);
  const boardChatHeight = useUIStore((s) => s.boardChatHeight);
  const activeCardId = cardId ?? storeActiveCardId;

  const activeCard = cards.find((c) => c.id === activeCardId) ?? null;

  // Column modal state
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Card modal state
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);

  const agentNames: Record<string, string> = {};
  for (const agent of agents) {
    agentNames[agent.id] = agent.name;
  }

  const activeRunByCard: Record<string, string> = {};
  for (const run of activeRuns) {
    activeRunByCard[run.cardId] = run.id;
  }

  const handleRunClick = useCallback((runId: string) => {
    setSelectedRunId(runId);
  }, []);

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

  const handleAddColumn = useCallback(() => {
    setColumnModalOpen(true);
  }, []);

  const handleAddCard = useCallback((columnId: string) => {
    setSelectedColumnId(columnId);
    setCardModalOpen(true);
  }, []);

  if (boardLoading) {
    return (
      <Center h="80vh">
        <Loader color="pink" type="dots" />
      </Center>
    );
  }

  const drawerOffset = boardChatOpen ? boardChatHeight : 0;

  return (
    <Container fluid h={`calc(100vh - 100px - ${drawerOffset}px)`}>
      <Group mb="md" gap="sm">
        <Anchor component={Link} to="/boards" c="dimmed" size="sm">
          <Group gap={4}>
            <IconArrowLeft size={14} />
            Boards
          </Group>
        </Anchor>
        <Title order={3}>{board?.name ?? 'Board'}</Title>
        <div style={{ flex: 1 }} />
        <BoardChatToggle />
      </Group>

      <KanbanBoard
        columns={columns}
        cards={cards}
        agentNames={agentNames}
        activeRunByCard={activeRunByCard}
        onCardMove={handleCardMove}
        onCardClick={handleCardClick}
        onAddColumn={handleAddColumn}
        onAddCard={handleAddCard}
        onRunClick={handleRunClick}
      />

      <CardDetailDrawer
        card={activeCard}
        agents={agents}
        boardId={boardId ?? ''}
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

      {boardId && <BoardChatDrawer boardId={boardId} />}

      <Modal
        opened={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        title="Create Column"
        centered
        data-testid="create-column-modal"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.currentTarget.value)}
            placeholder="Column name..."
            data-testid="column-name-input"
          />
          <Button
            data-testid="column-create-btn"
            onClick={() => {
              if (newColumnName.trim()) {
                createColumn.mutate(
                  { name: newColumnName.trim(), position: columns.length },
                  {
                    onSuccess: () => {
                      notifications.show({
                        title: 'Column created',
                        message: `"${newColumnName.trim()}" has been added.`,
                        color: 'green',
                      });
                      setColumnModalOpen(false);
                      setNewColumnName('');
                    },
                  },
                );
              }
            }}
            loading={createColumn.isPending}
          >
            Create
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        title="Create Card"
        centered
        data-testid="create-card-modal"
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.currentTarget.value)}
            placeholder="Card title..."
            data-testid="card-title-input"
          />
          <Textarea
            label="Description"
            value={newCardDescription}
            onChange={(e) => setNewCardDescription(e.currentTarget.value)}
            placeholder="Optional description..."
            data-testid="card-description-input"
          />
          <Button
            data-testid="card-create-btn"
            onClick={() => {
              if (newCardTitle.trim() && selectedColumnId) {
                createCard.mutate(
                  {
                    title: newCardTitle.trim(),
                    columnId: selectedColumnId,
                    description: newCardDescription.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      notifications.show({
                        title: 'Card created',
                        message: `"${newCardTitle.trim()}" has been added.`,
                        color: 'green',
                      });
                      setCardModalOpen(false);
                      setNewCardTitle('');
                      setNewCardDescription('');
                      setSelectedColumnId(null);
                    },
                  },
                );
              }
            }}
            loading={createCard.isPending}
          >
            Create
          </Button>
        </Stack>
      </Modal>

      <LiveActivityFeed
        open={activityFeedOpen}
        onToggle={() => setActivityFeedOpen((o) => !o)}
        runs={activeRuns}
        agentNames={agentNames}
        onRunClick={handleRunClick}
      />

      <RunLogViewer
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </Container>
  );
}
