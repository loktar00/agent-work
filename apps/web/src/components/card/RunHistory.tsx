import {
  Stack,
  Group,
  Text,
  Badge,
  Accordion,
} from '@mantine/core';
import type { Run } from '@agent-board/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { EmptyState } from '../EmptyState';
import { TimeAgo } from '../TimeAgo';
import { LogViewer } from '../LogViewer';
import { IconHistory } from '@tabler/icons-react';

const statusColors: Record<string, string> = {
  queued: 'gray',
  running: 'yellow',
  completed: 'green',
  failed: 'red',
  cancelled: 'orange',
};

interface RunHistoryProps {
  cardId: string;
}

export function RunHistory({ cardId }: RunHistoryProps) {
  const { data: runs = [] } = useQuery<Run[]>({
    queryKey: queryKeys.runs.byCard(cardId),
    queryFn: () => api.get(`/api/cards/${cardId}/runs`),
  });

  if (runs.length === 0) {
    return (
      <EmptyState
        title="No runs"
        description="Agent runs for this card will appear here."
        icon={<IconHistory size={24} />}
      />
    );
  }

  return (
    <Accordion>
      {runs.map((run) => (
        <Accordion.Item key={run.id} value={run.id}>
          <Accordion.Control>
            <Group gap="xs" justify="space-between">
              <Group gap="xs">
                <Badge
                  color={statusColors[run.status]}
                  variant="filled"
                  size="sm"
                >
                  {run.status}
                </Badge>
                <Text size="xs" c="dimmed" truncate>
                  {run.id.slice(0, 8)}
                </Text>
              </Group>
              {run.startedAt && <TimeAgo date={run.startedAt} />}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <RunLogPanel runId={run.id} />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

function RunLogPanel({ runId }: { runId: string }) {
  const { data: events = [] } = useQuery<Array<{ data: string }>>({
    queryKey: ['runs', runId, 'events'],
    queryFn: () => api.get(`/api/runs/${runId}/events`),
  });

  const lines = events.map((e) => e.data);

  if (lines.length === 0) {
    return <Text size="sm" c="dimmed">No log output.</Text>;
  }

  return <LogViewer lines={lines} maxHeight={300} />;
}
