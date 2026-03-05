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
  ScrollArea,
  Box,
  Loader,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { IconSearch, IconRobot, IconArrowLeft } from '@tabler/icons-react';
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
  onClick,
}: {
  preset: AgentPreset;
  onClick: () => void;
}) {
  const color = COLOR_MAP[preset.color] ?? 'cyan';

  return (
    <Card
      p="sm"
      withBorder
      onClick={onClick}
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

      <Text size="xs" c="dimmed" mt={4} lineClamp={2}>
        {preset.description}
      </Text>

      <Group gap={4} mt={4}>
        {preset.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" size="xs" color="gray">
            {tag}
          </Badge>
        ))}
      </Group>
    </Card>
  );
}

function PresetDetail({
  preset,
  onBack,
  onUse,
  loading,
}: {
  preset: AgentPreset;
  onBack: () => void;
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
    enabled: !!preset.githubFile,
    staleTime: 60 * 60 * 1000,
  });

  const displayPersona = fullPersona ?? preset.persona;

  return (
    <Stack gap={0} style={{ height: '100%' }}>
      <Group gap="sm" justify="space-between" wrap="nowrap" mb="sm">
        <Group gap="xs" style={{ minWidth: 0 }}>
          <ActionIcon variant="subtle" size="sm" onClick={onBack}>
            <IconArrowLeft size={16} />
          </ActionIcon>
          <Text size="lg" fw={700} truncate>
            {preset.name}
          </Text>
          <Badge variant="light" size="sm" color={color}>
            {preset.role}
          </Badge>
        </Group>
        <Button
          size="sm"
          onClick={() => onUse(displayPersona)}
          loading={loading}
          disabled={personaLoading}
        >
          Use This Agent
        </Button>
      </Group>

      <Text size="sm" c="dimmed" mb="xs">
        {preset.description}
      </Text>

      <Group gap={4} mb="xs">
        {preset.tags.map((tag) => (
          <Badge key={tag} variant="outline" size="xs" color="gray">
            {tag}
          </Badge>
        ))}
        <Badge variant="light" size="xs">
          Runner: {preset.suggestedRunner}
        </Badge>
      </Group>

      <Divider mb="xs" />

      <ScrollArea.Autosize mah={400} style={{ flex: 1 }}>
        {personaLoading ? (
          <Loader size="sm" color="pink" />
        ) : (
          <MarkdownRenderer content={displayPersona} />
        )}
      </ScrollArea.Autosize>
    </Stack>
  );
}

export function AgentDirectory({ onCreated }: AgentDirectoryProps) {
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('All');
  const [selectedPreset, setSelectedPreset] = useState<AgentPreset | null>(null);
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

  if (selectedPreset) {
    return (
      <PresetDetail
        preset={selectedPreset}
        onBack={() => setSelectedPreset(null)}
        onUse={(fullPersona) => handleUse(selectedPreset, fullPersona)}
        loading={createAgent.isPending}
      />
    );
  }

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
                onClick={() => setSelectedPreset(preset)}
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
