import {
  Stack,
  Group,
  Checkbox,
  TextInput,
  Textarea,
  ActionIcon,
  Text,
  Button,
  Collapse,
  SegmentedControl,
  Badge,
} from '@mantine/core';
import { IconTrash, IconPlus, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';
import type { Subtask } from '@agent-board/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

const statusColors: Record<string, string> = {
  pending: 'gray',
  pass: 'green',
  fail: 'red',
};

interface SubtaskListProps {
  cardId: string;
}

export function SubtaskList({ cardId }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showDescInput, setShowDescInput] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const qc = useQueryClient();
  const key = ['cards', cardId, 'subtasks'] as const;

  const { data: subtasks = [] } = useQuery<Subtask[]>({
    queryKey: key,
    queryFn: () => api.get(`/api/cards/${cardId}/subtasks`),
  });

  const addMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      api.post(`/api/cards/${cardId}/subtasks`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const toggleMutation = useMutation({
    mutationFn: (subtask: Subtask) =>
      api.patch(`/api/subtasks/${subtask.id}`, {
        completed: !subtask.completed,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/subtasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/subtasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (newTitle.trim()) {
      addMutation.mutate({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewTitle('');
      setNewDescription('');
      setShowDescInput(false);
    }
  };

  return (
    <Stack gap="xs">
      {subtasks
        .sort((a, b) => a.position - b.position)
        .map((subtask) => (
          <Stack key={subtask.id} gap={0}>
            <Group gap="xs" wrap="nowrap">
              <Checkbox
                checked={subtask.completed}
                onChange={() => toggleMutation.mutate(subtask)}
              />
              {subtask.description && (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => toggleExpand(subtask.id)}
                >
                  {expandedIds.has(subtask.id) ? (
                    <IconChevronDown size={12} />
                  ) : (
                    <IconChevronRight size={12} />
                  )}
                </ActionIcon>
              )}
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
              {subtask.description && (
                <Badge size="xs" color={statusColors[subtask.status]} variant="filled">
                  {subtask.status}
                </Badge>
              )}
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                onClick={() => deleteMutation.mutate(subtask.id)}
              >
                <IconTrash size={12} />
              </ActionIcon>
            </Group>

            {subtask.description && (
              <Collapse in={expandedIds.has(subtask.id)}>
                <Stack gap="xs" ml={32} mt={4}>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                    {subtask.description}
                  </Text>
                  <SegmentedControl
                    size="xs"
                    value={subtask.status}
                    onChange={(v) =>
                      updateStatusMutation.mutate({ id: subtask.id, status: v })
                    }
                    data={[
                      { label: 'Pending', value: 'pending' },
                      { label: 'Pass', value: 'pass' },
                      { label: 'Fail', value: 'fail' },
                    ]}
                  />
                </Stack>
              </Collapse>
            )}
          </Stack>
        ))}

      <Stack gap="xs">
        <Group gap="xs">
          <TextInput
            placeholder="Add subtask..."
            size="xs"
            value={newTitle}
            onChange={(e) => setNewTitle(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim() && !showDescInput) {
                handleAdd();
              }
            }}
            style={{ flex: 1 }}
          />
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={() => setShowDescInput(!showDescInput)}
            title="Add description"
          >
            <IconChevronDown size={12} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="filled"
            color="pink"
            onClick={handleAdd}
          >
            <IconPlus size={12} />
          </ActionIcon>
        </Group>
        <Collapse in={showDescInput}>
          <Textarea
            placeholder="Optional description..."
            size="xs"
            value={newDescription}
            onChange={(e) => setNewDescription(e.currentTarget.value)}
            minRows={2}
            maxRows={4}
            autosize
          />
        </Collapse>
      </Stack>
    </Stack>
  );
}
