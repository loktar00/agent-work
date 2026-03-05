import {
  Container,
  Title,
  Stack,
  Group,
  Paper,
  Text,
  Badge,
  Progress,
  Textarea,
  Button,
  Divider,
  List,
  Accordion,
} from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LogViewer } from '../components/LogViewer';
import type {
  Card,
  Subtask,
  Run,
  Artifact,
} from '@agent-board/shared';

export default function ApprovalPage() {
  const { boardId, cardId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');

  const { data: card } = useQuery<Card>({
    queryKey: queryKeys.cards.detail(cardId!),
    queryFn: () => api.get(`/api/cards/${cardId}`),
    enabled: !!cardId,
  });

  const { data: subtasks = [] } = useQuery<Subtask[]>({
    queryKey: ['cards', cardId, 'subtasks'],
    queryFn: () => api.get(`/api/cards/${cardId}/subtasks`),
    enabled: !!cardId,
  });

  const { data: runs = [] } = useQuery<Run[]>({
    queryKey: queryKeys.runs.byCard(cardId!),
    queryFn: () => api.get(`/api/cards/${cardId}/runs`),
    enabled: !!cardId,
  });

  const { data: artifacts = [] } = useQuery<Artifact[]>({
    queryKey: queryKeys.artifacts.byCard(cardId!),
    queryFn: () => api.get(`/api/cards/${cardId}/artifacts`),
    enabled: !!cardId,
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/cards/${cardId}/approve`, { notes, action: 'approve' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId!) });
      navigate(`/boards/${boardId}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/cards/${cardId}/approve`, { notes, action: 'reject' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId!) });
      navigate(`/boards/${boardId}`);
    },
  });

  if (!card) {
    return (
      <Container>
        <EmptyState title="Card not found" />
      </Container>
    );
  }

  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const subtasksWithDesc = subtasks.filter((s) => s.description);
  const passedCriteria = subtasksWithDesc.filter((s) => s.status === 'pass').length;
  const failedCriteria = subtasksWithDesc.filter((s) => s.status === 'fail').length;
  const testArtifacts = artifacts.filter((a) => a.type === 'test_result');
  const diffArtifacts = artifacts.filter((a) => a.type === 'diff');

  return (
    <Container size="md">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>{card.title}</Title>
          <StatusBadge status={card.status} size="lg" />
        </Group>

        <Paper p="md" withBorder>
          <Text fw={600} mb="sm">Completion Checklist</Text>
          <Group gap="xs" mb="xs">
            <Text size="sm">
              Subtasks: {completedSubtasks}/{subtasks.length}
            </Text>
            <Progress
              value={subtasks.length ? (completedSubtasks / subtasks.length) * 100 : 0}
              size="sm"
              color="green"
              style={{ flex: 1 }}
            />
          </Group>
          <List size="sm" spacing="xs">
            {subtasks.map((s) => (
              <List.Item
                key={s.id}
                icon={s.completed ? <IconCheck size={14} color="green" /> : <IconX size={14} color="gray" />}
              >
                <Text
                  size="sm"
                  td={s.completed ? 'line-through' : undefined}
                  c={s.completed ? 'dimmed' : undefined}
                >
                  {s.title}
                </Text>
              </List.Item>
            ))}
          </List>
        </Paper>

        {subtasksWithDesc.length > 0 && (
          <Paper p="md" withBorder>
            <Text fw={600} mb="sm">Criteria (Subtasks with Descriptions)</Text>
            <Group gap="md" mb="sm">
              <Badge color="green" variant="filled">{passedCriteria} passed</Badge>
              <Badge color="red" variant="filled">{failedCriteria} failed</Badge>
              <Badge color="gray" variant="filled">
                {subtasksWithDesc.length - passedCriteria - failedCriteria} pending
              </Badge>
            </Group>
            <List size="sm" spacing="xs">
              {subtasksWithDesc.map((s) => (
                <List.Item
                  key={s.id}
                  icon={
                    s.status === 'pass' ? (
                      <IconCheck size={14} color="green" />
                    ) : s.status === 'fail' ? (
                      <IconX size={14} color="red" />
                    ) : null
                  }
                >
                  <Text size="sm">{s.title}: {s.description}</Text>
                </List.Item>
              ))}
            </List>
          </Paper>
        )}

        {diffArtifacts.length > 0 && (
          <Paper p="md" withBorder>
            <Text fw={600} mb="sm">Changed Files</Text>
            <List size="sm">
              {diffArtifacts.map((a) => (
                <List.Item key={a.id}>
                  <Text size="sm" ff="monospace">{a.name}</Text>
                </List.Item>
              ))}
            </List>
          </Paper>
        )}

        {testArtifacts.length > 0 && (
          <Paper p="md" withBorder>
            <Text fw={600} mb="sm">Test Results</Text>
            {testArtifacts.map((a) => (
              <Paper key={a.id} p="xs" withBorder mb="xs">
                <Text size="sm" fw={500}>{a.name}</Text>
                {a.content && (
                  <LogViewer lines={a.content.split('\n')} maxHeight={200} />
                )}
              </Paper>
            ))}
          </Paper>
        )}

        {runs.length > 0 && (
          <Paper p="md" withBorder>
            <Text fw={600} mb="sm">Agent Runs</Text>
            <Accordion>
              {runs.map((run) => (
                <Accordion.Item key={run.id} value={run.id}>
                  <Accordion.Control>
                    <Group gap="xs">
                      <Badge
                        color={run.status === 'completed' ? 'green' : run.status === 'failed' ? 'red' : 'yellow'}
                        size="sm"
                      >
                        {run.status}
                      </Badge>
                      <Text size="xs" c="dimmed">{run.id.slice(0, 8)}</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Text size="sm" c="dimmed">
                      {run.prompt ?? 'No prompt recorded.'}
                    </Text>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Paper>
        )}

        <Divider />

        <Paper p="md" withBorder>
          <Text fw={600} mb="sm">Review Notes</Text>
          <Textarea
            placeholder="Add notes for the agent..."
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            autosize
            minRows={3}
            mb="md"
          />
          <Group justify="flex-end">
            <Button
              variant="outline"
              color="red"
              leftSection={<IconX size={16} />}
              onClick={() => rejectMutation.mutate()}
              loading={rejectMutation.isPending}
            >
              Request Changes
            </Button>
            <Button
              color="green"
              leftSection={<IconCheck size={16} />}
              onClick={() => approveMutation.mutate()}
              loading={approveMutation.isPending}
            >
              Approve
            </Button>
          </Group>
        </Paper>
      </Stack>
    </Container>
  );
}
