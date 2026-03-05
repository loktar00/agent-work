import {
  ActionIcon,
  Container,
  Loader,
  Center,
  Modal,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Button,
  Stack,
  Title,
  Group,
  Anchor,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { IconArrowLeft, IconSettings } from '@tabler/icons-react';
import { useBoard, useUpdateBoard } from '../api/hooks/useBoards';
import { useColumns, useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumns } from '../api/hooks/useColumns';
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
  const updateColumn = useUpdateColumn(boardId ?? '');
  const deleteColumn = useDeleteColumn(boardId ?? '');
  const reorderColumns = useReorderColumns(boardId ?? '');
  const updateBoard = useUpdateBoard(boardId ?? '');
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

  // Column create modal state
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Column edit modal state
  const [editColumnId, setEditColumnId] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState('');
  const [editColumnAgentId, setEditColumnAgentId] = useState<string | null>(null);
  const [editColumnWipLimit, setEditColumnWipLimit] = useState<number | string>('');

  // Column delete confirm state
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);

  // Board settings modal state
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [settingsProjectDir, setSettingsProjectDir] = useState('');
  const [settingsWorktreeMode, setSettingsWorktreeMode] = useState<string | null>('none');

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

  const handleEditColumn = useCallback((columnId: string) => {
    const col = columns.find((c) => c.id === columnId);
    if (col) {
      setEditColumnId(columnId);
      setEditColumnName(col.name);
      setEditColumnAgentId(col.agentId ?? null);
      setEditColumnWipLimit(col.wipLimit ?? '');
    }
  }, [columns]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setDeleteColumnId(columnId);
  }, []);

  const handleMoveColumn = useCallback((columnId: string, direction: 'left' | 'right') => {
    const sorted = [...columns].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((c) => c.id === columnId);
    if (idx < 0) return;
    const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    // Swap positions
    const reordered = sorted.map((c) => c.id);
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    reorderColumns.mutate(reordered);
  }, [columns, reorderColumns]);

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
        <Tooltip label="Board Settings">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => {
              setSettingsProjectDir(board?.projectDir ?? '');
              setSettingsWorktreeMode(board?.worktreeMode ?? 'none');
              setBoardSettingsOpen(true);
            }}
          >
            <IconSettings size={16} />
          </ActionIcon>
        </Tooltip>
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
        onEditColumn={handleEditColumn}
        onDeleteColumn={handleDeleteColumn}
        onMoveColumn={handleMoveColumn}
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

      <Modal
        opened={!!editColumnId}
        onClose={() => setEditColumnId(null)}
        title="Edit Column"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={editColumnName}
            onChange={(e) => setEditColumnName(e.currentTarget.value)}
          />
          <Select
            label="Assigned Agent"
            value={editColumnAgentId}
            onChange={setEditColumnAgentId}
            data={agents.map((a) => ({ value: a.id, label: `${a.name} (${a.role})` }))}
            clearable
            placeholder="No agent assigned"
          />
          <NumberInput
            label="WIP Limit"
            value={editColumnWipLimit}
            onChange={setEditColumnWipLimit}
            min={1}
            placeholder="No limit"
            allowDecimal={false}
          />
          <Button
            onClick={() => {
              if (editColumnId && editColumnName.trim()) {
                updateColumn.mutate(
                  {
                    columnId: editColumnId,
                    name: editColumnName.trim(),
                    agentId: editColumnAgentId,
                    wipLimit: typeof editColumnWipLimit === 'number' ? editColumnWipLimit : null,
                  },
                  {
                    onSuccess: () => {
                      notifications.show({
                        title: 'Column updated',
                        message: `"${editColumnName.trim()}" has been updated.`,
                        color: 'green',
                      });
                      setEditColumnId(null);
                    },
                  },
                );
              }
            }}
            loading={updateColumn.isPending}
          >
            Save
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={!!deleteColumnId}
        onClose={() => setDeleteColumnId(null)}
        title="Delete Column"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete this column? All cards in this column will also be deleted. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteColumnId(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (deleteColumnId) {
                  deleteColumn.mutate(deleteColumnId, {
                    onSuccess: () => {
                      notifications.show({
                        title: 'Column deleted',
                        message: 'The column has been removed.',
                        color: 'red',
                      });
                      setDeleteColumnId(null);
                    },
                  });
                }
              }}
              loading={deleteColumn.isPending}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={boardSettingsOpen}
        onClose={() => setBoardSettingsOpen(false)}
        title="Board Settings"
        centered
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Project Directory"
            description="Absolute path to the project's git repository"
            value={settingsProjectDir}
            onChange={(e) => setSettingsProjectDir(e.currentTarget.value)}
            placeholder="/home/user/projects/my-app"
          />
          <Select
            label="Worktree Mode"
            description="How to handle concurrent agent work"
            value={settingsWorktreeMode}
            onChange={setSettingsWorktreeMode}
            data={[
              { value: 'none', label: 'None — all agents work in the same directory' },
              { value: 'auto', label: 'Auto — create a worktree per task automatically' },
              { value: 'manual', label: 'Manual — manage worktrees yourself' },
            ]}
          />
          {settingsWorktreeMode === 'auto' && (
            <Text size="xs" c="dimmed">
              When a task enters an agent's column, AWALL will create a git worktree with a branch named after the card.
              Each concurrent task runs in its own worktree so agents don't conflict.
            </Text>
          )}
          <Button
            onClick={() => {
              updateBoard.mutate(
                {
                  projectDir: settingsProjectDir.trim() || null,
                  worktreeMode: settingsWorktreeMode ?? 'none',
                },
                {
                  onSuccess: () => {
                    notifications.show({
                      title: 'Board settings saved',
                      message: 'Project directory and worktree mode updated.',
                      color: 'green',
                    });
                    setBoardSettingsOpen(false);
                  },
                },
              );
            }}
            loading={updateBoard.isPending}
          >
            Save Settings
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
