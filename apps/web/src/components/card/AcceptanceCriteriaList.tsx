import {
  Stack,
  Group,
  Badge,
  Text,
  TextInput,
  ActionIcon,
  SegmentedControl,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { AcceptanceCriterion } from '@agent-board/shared';
import { AcceptanceCriteriaStatus } from '@agent-board/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

const statusColors: Record<string, string> = {
  pending: 'gray',
  pass: 'green',
  fail: 'red',
};

interface AcceptanceCriteriaListProps {
  cardId: string;
}

export function AcceptanceCriteriaList({ cardId }: AcceptanceCriteriaListProps) {
  const [newDesc, setNewDesc] = useState('');
  const qc = useQueryClient();
  const key = ['cards', cardId, 'criteria'] as const;

  const { data: criteria = [] } = useQuery<AcceptanceCriterion[]>({
    queryKey: key,
    queryFn: () => api.get(`/api/cards/${cardId}/acceptance-criteria`),
  });

  const addMutation = useMutation({
    mutationFn: (description: string) =>
      api.post(`/api/cards/${cardId}/acceptance-criteria`, { description }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/cards/${cardId}/acceptance-criteria/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/cards/${cardId}/acceptance-criteria/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <Stack gap="xs">
      {criteria
        .sort((a, b) => a.position - b.position)
        .map((criterion) => (
          <Group key={criterion.id} gap="xs" wrap="nowrap" align="flex-start">
            <Badge
              color={statusColors[criterion.status]}
              variant="filled"
              size="xs"
              mt={4}
            >
              {criterion.status}
            </Badge>
            <Text size="sm" style={{ flex: 1 }}>
              {criterion.description}
            </Text>
            <SegmentedControl
              size="xs"
              value={criterion.status}
              onChange={(v) =>
                updateMutation.mutate({ id: criterion.id, status: v })
              }
              data={[
                { label: 'Pending', value: 'pending' },
                { label: 'Pass', value: 'pass' },
                { label: 'Fail', value: 'fail' },
              ]}
            />
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              onClick={() => deleteMutation.mutate(criterion.id)}
            >
              <IconTrash size={12} />
            </ActionIcon>
          </Group>
        ))}
      <Group gap="xs">
        <TextInput
          placeholder="Add acceptance criterion..."
          size="xs"
          value={newDesc}
          onChange={(e) => setNewDesc(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newDesc.trim()) {
              addMutation.mutate(newDesc.trim());
              setNewDesc('');
            }
          }}
          style={{ flex: 1 }}
        />
        <ActionIcon
          size="sm"
          variant="filled"
          color="pink"
          onClick={() => {
            if (newDesc.trim()) {
              addMutation.mutate(newDesc.trim());
              setNewDesc('');
            }
          }}
        >
          <IconPlus size={12} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
