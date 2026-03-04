import {
  Stack,
  Group,
  Checkbox,
  TextInput,
  ActionIcon,
  Text,
  Button,
} from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import type { Subtask } from '@agent-board/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

interface SubtaskListProps {
  cardId: string;
}

export function SubtaskList({ cardId }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const qc = useQueryClient();
  const key = ['cards', cardId, 'subtasks'] as const;

  const { data: subtasks = [] } = useQuery<Subtask[]>({
    queryKey: key,
    queryFn: () => api.get(`/api/cards/${cardId}/subtasks`),
  });

  const addMutation = useMutation({
    mutationFn: (title: string) =>
      api.post(`/api/cards/${cardId}/subtasks`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const toggleMutation = useMutation({
    mutationFn: (subtask: Subtask) =>
      api.patch(`/api/subtasks/${subtask.id}`, {
        completed: !subtask.completed,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/subtasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <Stack gap="xs">
      {subtasks
        .sort((a, b) => a.position - b.position)
        .map((subtask) => (
          <Group key={subtask.id} gap="xs" wrap="nowrap">
            <Checkbox
              checked={subtask.completed}
              onChange={() => toggleMutation.mutate(subtask)}
            />
            <Text
              size="sm"
              style={{
                flex: 1,
                textDecoration: subtask.completed ? 'line-through' : 'none',
                opacity: subtask.completed ? 0.6 : 1,
              }}
            >
              {subtask.title}
            </Text>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              onClick={() => deleteMutation.mutate(subtask.id)}
            >
              <IconTrash size={12} />
            </ActionIcon>
          </Group>
        ))}
      <Group gap="xs">
        <TextInput
          placeholder="Add subtask..."
          size="xs"
          value={newTitle}
          onChange={(e) => setNewTitle(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTitle.trim()) {
              addMutation.mutate(newTitle.trim());
              setNewTitle('');
            }
          }}
          style={{ flex: 1 }}
        />
        <ActionIcon
          size="sm"
          variant="filled"
          color="pink"
          onClick={() => {
            if (newTitle.trim()) {
              addMutation.mutate(newTitle.trim());
              setNewTitle('');
            }
          }}
        >
          <IconPlus size={12} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
