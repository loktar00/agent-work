import {
  Container,
  SimpleGrid,
  Card,
  Text,
  Group,
  Button,
  Modal,
  TextInput,
  Textarea,
  Stack,
  Title,
} from '@mantine/core';
import { IconPlus, IconLayout2 } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useBoards, useCreateBoard } from '../api/hooks/useBoards';
import { EmptyState } from '../components/EmptyState';
import { TimeAgo } from '../components/TimeAgo';
import type { Board } from '@agent-board/shared';

export default function BoardListPage() {
  const navigate = useNavigate();
  const { data: boards = [] } = useBoards() as { data: Board[] };
  const createBoard = useCreateBoard();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  return (
    <Container>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Boards</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateOpen(true)}
        >
          New Board
        </Button>
      </Group>

      {boards.length === 0 ? (
        <EmptyState
          title="No boards yet"
          description="Create your first board to start organizing agent work."
          icon={<IconLayout2 size={24} />}
          action={
            <Button onClick={() => setCreateOpen(true)} leftSection={<IconPlus size={14} />}>
              Create Board
            </Button>
          }
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {boards.map((board) => (
            <Card
              key={board.id}
              p="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/boards/${board.id}`)}
            >
              <Group justify="space-between" mb="xs">
                <Text fw={600}>{board.name}</Text>
              </Group>
              {board.description && (
                <Text size="sm" c="dimmed" lineClamp={2} mb="xs">
                  {board.description}
                </Text>
              )}
              <TimeAgo date={board.updatedAt} />
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Board"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            placeholder="Board name..."
          />
          <Textarea
            label="Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.currentTarget.value)}
            placeholder="Optional description..."
          />
          <Button
            onClick={() => {
              if (newName.trim()) {
                createBoard.mutate(
                  {
                    name: newName.trim(),
                    description: newDesc.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      setCreateOpen(false);
                      setNewName('');
                      setNewDesc('');
                    },
                  },
                );
              }
            }}
            loading={createBoard.isPending}
          >
            Create
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
