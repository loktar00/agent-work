import {
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Text,
  JsonInput,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import type { Agent } from '@agent-board/shared';

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
        minRows={3}
        maxRows={8}
        placeholder="Describe the agent's personality and behavior..."
      />
      <Select
        label="Runner"
        value={runnerId}
        onChange={setRunnerId}
        data={[
          { value: 'claude-code', label: 'Claude Code' },
          { value: 'codex', label: 'Codex CLI' },
          { value: 'aider', label: 'Aider' },
          { value: 'custom', label: 'Custom' },
        ]}
        clearable
        placeholder="Select runner..."
      />
      <JsonInput
        label="Model Config"
        value={modelConfig}
        onChange={setModelConfig}
        autosize
        minRows={3}
        maxRows={8}
        validationError="Invalid JSON"
        formatOnBlur
      />

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving}>
          Save
        </Button>
      </Group>
    </Stack>
  );
}
