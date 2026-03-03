import { Stack, Group, Text, Badge, Card, Anchor } from '@mantine/core';
import { IconFile, IconLink, IconCode, IconTestPipe, IconGitCompare } from '@tabler/icons-react';
import type { Artifact } from '@agent-board/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { EmptyState } from '../EmptyState';
import { TimeAgo } from '../TimeAgo';
import type { ReactNode } from 'react';

const typeIcons: Record<string, ReactNode> = {
  log: <IconCode size={14} />,
  file: <IconFile size={14} />,
  url: <IconLink size={14} />,
  test_result: <IconTestPipe size={14} />,
  diff: <IconGitCompare size={14} />,
};

const typeColors: Record<string, string> = {
  log: 'blue',
  file: 'green',
  url: 'violet',
  test_result: 'yellow',
  diff: 'orange',
};

interface ArtifactsListProps {
  cardId: string;
}

export function ArtifactsList({ cardId }: ArtifactsListProps) {
  const { data: artifacts = [] } = useQuery<Artifact[]>({
    queryKey: queryKeys.artifacts.byCard(cardId),
    queryFn: () => api.get(`/api/cards/${cardId}/artifacts`),
  });

  if (artifacts.length === 0) {
    return (
      <EmptyState
        title="No artifacts"
        description="Artifacts from agent runs will appear here."
        icon={<IconFile size={24} />}
      />
    );
  }

  return (
    <Stack gap="xs">
      {artifacts.map((artifact) => (
        <Card key={artifact.id} p="xs" withBorder>
          <Group gap="xs" justify="space-between">
            <Group gap="xs">
              <Badge
                leftSection={typeIcons[artifact.type]}
                color={typeColors[artifact.type]}
                variant="light"
                size="sm"
              >
                {artifact.type}
              </Badge>
              <Text size="sm" fw={500}>
                {artifact.name}
              </Text>
            </Group>
            <TimeAgo date={artifact.createdAt} />
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
