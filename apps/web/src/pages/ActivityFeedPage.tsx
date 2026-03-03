import {
  Container,
  Stack,
  Title,
  Group,
  Select,
  Paper,
  Text,
  Badge,
  ScrollArea,
} from '@mantine/core';
import { useState } from 'react';
import {
  IconArrowsMove,
  IconMessage,
  IconPlayerPlay,
  IconCheck,
  IconActivity,
} from '@tabler/icons-react';
import type { AuditEntry } from '@agent-board/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { TimeAgo } from '../components/TimeAgo';
import { EmptyState } from '../components/EmptyState';
import type { ReactNode } from 'react';

const eventTypeIcons: Record<string, ReactNode> = {
  move: <IconArrowsMove size={14} />,
  create: <IconMessage size={14} />,
  update: <IconPlayerPlay size={14} />,
  approve: <IconCheck size={14} />,
};

const eventTypeColors: Record<string, string> = {
  move: 'blue',
  create: 'green',
  update: 'yellow',
  delete: 'red',
  approve: 'teal',
  reject: 'red',
  claim: 'violet',
  release: 'orange',
};

export default function ActivityFeedPage() {
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  // Use a generic board activity endpoint; in practice this would use the current board
  const { data: events = [] } = useQuery<AuditEntry[]>({
    queryKey: ['activity', entityFilter, actionFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityFilter) params.set('entity', entityFilter);
      if (actionFilter) params.set('action', actionFilter);
      const qs = params.toString();
      return api.get(`/api/activity${qs ? `?${qs}` : ''}`);
    },
  });

  return (
    <Container>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Activity Feed</Title>
        <Group gap="xs">
          <Select
            size="xs"
            placeholder="Entity"
            data={['card', 'column', 'agent', 'board', 'run']}
            value={entityFilter}
            onChange={setEntityFilter}
            clearable
          />
          <Select
            size="xs"
            placeholder="Action"
            data={['create', 'update', 'delete', 'move', 'claim', 'release', 'approve', 'reject']}
            value={actionFilter}
            onChange={setActionFilter}
            clearable
          />
        </Group>
      </Group>

      {events.length === 0 ? (
        <EmptyState
          title="No activity"
          description="Activity events will appear here as agents work."
          icon={<IconActivity size={24} />}
        />
      ) : (
        <ScrollArea h="calc(100vh - 200px)">
          <Stack gap="xs">
            {events.map((event) => (
              <Paper key={event.id} p="sm" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Badge
                      leftSection={eventTypeIcons[event.action]}
                      color={eventTypeColors[event.action] ?? 'gray'}
                      variant="light"
                      size="sm"
                    >
                      {event.action}
                    </Badge>
                    <Badge variant="outline" size="xs">
                      {event.entity}
                    </Badge>
                    <Text size="sm">
                      {event.actorType}:{event.actorId.slice(0, 8)}
                    </Text>
                  </Group>
                  <TimeAgo date={event.createdAt} />
                </Group>
              </Paper>
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Container>
  );
}
