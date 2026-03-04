import {
  Stack,
  Card,
  Group,
  Text,
  Button,
  Badge,
} from '@mantine/core';
import { IconPlus, IconRobot } from '@tabler/icons-react';
import type { Agent } from '@agent-board/shared';
import { EmptyState } from '../EmptyState';

interface AgentListProps {
  agents: Agent[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCreateClick: () => void;
}

export function AgentList({ agents, selectedId, onSelect, onCreateClick }: AgentListProps) {
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="lg" fw={600}>
          Agents
        </Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={onCreateClick} data-testid="new-agent-btn">
          New Agent
        </Button>
      </Group>

      {agents.length === 0 ? (
        <EmptyState
          title="No agents"
          description="Create your first agent or browse templates."
          icon={<IconRobot size={24} />}
        />
      ) : (
        agents.map((agent) => (
          <Card
            key={agent.id}
            p="sm"
            withBorder
            onClick={() => onSelect(agent.id)}
            style={{
              cursor: 'pointer',
              borderColor:
                selectedId === agent.id
                  ? 'var(--mantine-color-pink-5)'
                  : undefined,
            }}
          >
            <Group gap="sm" justify="space-between">
              <Group gap="xs">
                <IconRobot size={16} />
                <Text size="sm" fw={500}>
                  {agent.name}
                </Text>
              </Group>
              <Badge variant="light" size="xs">
                {agent.role}
              </Badge>
            </Group>
          </Card>
        ))
      )}
    </Stack>
  );
}
