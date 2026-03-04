import {
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Text,
  JsonInput,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconFileDownload } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import type { Agent } from '@agent-board/shared';

const RUNNER_CONFIGS: Record<string, Record<string, unknown>> = {
  'claude-code': { model: 'sonnet', maxTurns: 10, allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'] },
  droid: { model: 'claude-sonnet-4-20250514', maxTokens: 8192 },
  opencode: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  codex: { model: 'o4-mini', approval: 'auto-edit' },
  aider: { model: 'sonnet', editFormat: 'diff' },
};

interface AgentDetailFormProps {
  agent: Agent | null;
  onSave: (data: Partial<Agent>) => void;
  saving?: boolean;
}

export function AgentDetailForm({ agent, onSave, saving }: AgentDetailFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [persona, setPersona] = useState('');
  const [runnerId, setRunnerId] = useState<string | null>(null);
  const [modelConfig, setModelConfig] = useState('{}');

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setRole(agent.role);
      setPersona(agent.persona ?? '');
      setRunnerId(agent.runnerId);
      setModelConfig(
        agent.modelConfig ? JSON.stringify(agent.modelConfig, null, 2) : '{}',
      );
    }
  }, [agent]);

  if (!agent) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed">Select an agent to view details.</Text>
      </Stack>
    );
  }

  const handleSave = () => {
    let parsedConfig: Record<string, unknown> | null = null;
    try {
      parsedConfig = JSON.parse(modelConfig);
    } catch {
      // keep null
    }

    onSave({
      name,
      role,
      persona: persona || null,
      runnerId,
      modelConfig: parsedConfig,
    });
  };

  const loadSampleConfig = () => {
    if (runnerId && RUNNER_CONFIGS[runnerId]) {
      setModelConfig(JSON.stringify(RUNNER_CONFIGS[runnerId], null, 2));
    }
  };

  return (
    <Stack gap="md">
      <Text size="lg" fw={600}>
        Agent Details
      </Text>

      <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
      <TextInput label="Role" value={role} onChange={(e) => setRole(e.currentTarget.value)} />
      <Textarea
        label="Persona"
        value={persona}
        onChange={(e) => setPersona(e.currentTarget.value)}
        autosize
        minRows={8}
        maxRows={20}
        placeholder="Describe the agent's personality and behavior..."
      />
      <Select
        label="Runner"
        value={runnerId}
        onChange={setRunnerId}
        data={[
          { value: 'claude-code', label: 'Claude Code' },
          { value: 'droid', label: 'Factory Droid' },
          { value: 'opencode', label: 'OpenCode' },
          { value: 'codex', label: 'Codex CLI' },
          { value: 'aider', label: 'Aider' },
          { value: 'custom', label: 'Custom' },
        ]}
        clearable
        placeholder="Select runner..."
      />
      <Text size="xs" c="dimmed">
        Assign an agent to a board column to auto-run tasks, or trigger runs manually from cards.
      </Text>
      <Group gap="xs" align="flex-end">
        <JsonInput
          label="Model Config"
          value={modelConfig}
          onChange={setModelConfig}
          autosize
          minRows={3}
          maxRows={8}
          validationError="Invalid JSON"
          formatOnBlur
          style={{ flex: 1 }}
        />
        <Tooltip label={runnerId && RUNNER_CONFIGS[runnerId] ? `Load sample ${runnerId} config` : 'Select a runner first'}>
          <ActionIcon
            variant="subtle"
            onClick={loadSampleConfig}
            disabled={!runnerId || !RUNNER_CONFIGS[runnerId]}
            mb={4}
          >
            <IconFileDownload size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving}>
          Save
        </Button>
      </Group>
    </Stack>
  );
}
