import { useState, useMemo } from 'react';
import {
  Stack,
  TextInput,
  SegmentedControl,
  SimpleGrid,
  Card,
  Text,
  Badge,
  Group,
  Button,
  Collapse,
  ScrollArea,
  Box,
  Loader,
} from '@mantine/core';
import { IconSearch, IconRobot } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { agentPresets, divisions } from '../../data/agentPresets';
import type { AgentPreset } from '../../data/agentPresets';
import { useCreateAgent } from '../../api/hooks/useAgents';
import { api } from '../../api/client';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface AgentDirectoryProps {
  onCreated: (id: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  cyan: 'cyan',
  blue: 'blue',
  indigo: 'indigo',
  violet: 'violet',
  grape: 'grape',
  pink: 'pink',
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  lime: 'lime',
  green: 'green',
  teal: 'teal',
  gray: 'gray',
  dark: 'dark',
};

function PresetCard({
  preset,
  expanded,
  onToggle,
  onUse,
  loading,
}: {
  preset: AgentPreset;
  expanded: boolean;
  onToggle: () => void;
  onUse: (fullPersona: string) => void;
  loading: boolean;
}) {
  const color = COLOR_MAP[preset.color] ?? 'cyan';

  const { data: fullPersona, isLoading: personaLoading } = useQuery<string>({
    queryKey: ['agent-persona', preset.githubFile],
    queryFn: async () => {
      if (!preset.githubFile) return preset.persona;
      const res = await api.get<{ content: string }>(
        `/api/agent-personas/${preset.githubFile}`,
      );
      return res.content;
    },
    enabled: expanded && !!preset.githubFile,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const displayPersona = fullPersona ?? preset.persona;

  return (
    <Card
      p="sm"
      withBorder
      onClick={onToggle}
      style={{
        cursor: 'pointer',
        borderLeft: `3px solid var(--mantine-color-${color}-5)`,
      }}
    >
      <Group gap="sm" justify="space-between" wrap="nowrap">
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={600} truncate>
            {preset.name}
          </Text>
          <Badge variant="light" size="xs" color={color} mt={2}>
            {preset.role}
          </Badge>
        </Box>
        <IconRobot size={16} style={{ flexShrink: 0, opacity: 0.5 }} />
      </Group>

      <Text size="xs" c="dimmed" mt={4} lineClamp={expanded ? undefined : 1}>
        {preset.description}
      </Text>

      <Group gap={4} mt={4}>
        {preset.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" size="xs" color="gray">
            {tag}
          </Badge>
        ))}
      </Group>

      <Collapse in={expanded}>
        <Stack gap="xs" mt="sm">
          <ScrollArea.Autosize mah={300}>
            {personaLoading ? (
              <Loader size="sm" color="pink" />
            ) : (
              <MarkdownRenderer content={displayPersona} />
            )}
          </ScrollArea.Autosize>

          <Group gap="xs">
            <Badge variant="light" size="xs">
              Runner: {preset.suggestedRunner}
            </Badge>
          </Group>

          <Button
            size="xs"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onUse(displayPersona);
            }}
            loading={loading}
          >
            Use This Agent
          </Button>
        </Stack>
      </Collapse>
    </Card>
  );
}

export function AgentDirectory({ onCreated }: AgentDirectoryProps) {
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const createAgent = useCreateAgent();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return agentPresets.filter((p) => {
      if (division !== 'All' && p.division !== division) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [search, division]);

  const handleUse = (preset: AgentPreset, fullPersona: string) => {
    createAgent.mutate(
      {
        name: preset.name,
        role: preset.role,
        persona: fullPersona,
        runnerId: preset.suggestedRunner,
        modelConfig: preset.suggestedModelConfig,
      },
      {
        onSuccess: (data: unknown) => {
          onCreated((data as { id: string }).id);
        },
      },
    );
  };

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Search agents..."
        leftSection={<IconSearch size={14} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />

      <ScrollArea type="auto">
        <SegmentedControl
          size="xs"
          value={division}
          onChange={setDivision}
          data={['All', ...divisions]}
        />
      </ScrollArea>

      <ScrollArea.Autosize mah={420}>
        {filtered.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            No agents match your search.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {filtered.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                expanded={expandedId === preset.id}
                onToggle={() =>
                  setExpandedId(expandedId === preset.id ? null : preset.id)
                }
                onUse={(fullPersona) => handleUse(preset, fullPersona)}
                loading={createAgent.isPending}
              />
            ))}
          </SimpleGrid>
        )}
      </ScrollArea.Autosize>

      <Text size="xs" c="dimmed" ta="center">
        Agent templates by AgentLand Contributors (MIT)
      </Text>
    </Stack>
  );
}
