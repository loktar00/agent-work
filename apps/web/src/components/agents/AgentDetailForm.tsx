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
  Switch,
  Divider,
  PasswordInput,
  Alert,
} from '@mantine/core';
import { IconFileDownload, IconPlugConnected } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import type { Agent, LLMSettings } from '@agent-board/shared';
import { api } from '../../api/client';

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
  onDelete?: () => void;
  saving?: boolean;
  deleting?: boolean;
}

export function AgentDetailForm({ agent, onSave, onDelete, saving, deleting }: AgentDetailFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [persona, setPersona] = useState('');
  const [runnerId, setRunnerId] = useState<string | null>(null);
  const [modelConfig, setModelConfig] = useState('{}');
  const [useGlobalLLM, setUseGlobalLLM] = useState(true);
  const [llmProvider, setLlmProvider] = useState<string>('openai');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setRole(agent.role);
      setPersona(agent.persona ?? '');
      setRunnerId(agent.runnerId);
      setModelConfig(
        agent.modelConfig ? JSON.stringify(agent.modelConfig, null, 2) : '{}',
      );
      if (agent.llmConfig) {
        setUseGlobalLLM(false);
        setLlmProvider(agent.llmConfig.provider);
        setLlmBaseUrl(agent.llmConfig.baseUrl);
        setLlmApiKey(agent.llmConfig.apiKey);
        setLlmModel(agent.llmConfig.model);
      } else {
        setUseGlobalLLM(true);
        setLlmProvider('openai');
        setLlmBaseUrl('');
        setLlmApiKey('');
        setLlmModel('');
      }
      setTestStatus('idle');
      setTestMessage('');
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

    const llmConfig: LLMSettings | null = useGlobalLLM
      ? null
      : {
          provider: llmProvider as 'openai' | 'anthropic',
          baseUrl: llmBaseUrl,
          apiKey: llmApiKey,
          model: llmModel,
        };

    onSave({
      name,
      role,
      persona: persona || null,
      runnerId,
      modelConfig: parsedConfig,
      llmConfig,
    });
  };

  const handleTestConnection = async () => {
    if (!agent) return;
    setTestStatus('loading');
    setTestMessage('');
    try {
      const result = await api.post<{ success: boolean; message: string }>(
        `/api/agents/${agent.id}/llm-test`,
        {},
      );
      setTestStatus('success');
      setTestMessage(result.message);
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err?.message ?? 'Connection failed');
    }
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

      <Divider my="sm" />
      <Text size="lg" fw={600}>
        LLM Configuration
      </Text>

      <Switch
        label="Use Global Settings"
        checked={useGlobalLLM}
        onChange={(e) => setUseGlobalLLM(e.currentTarget.checked)}
      />

      <Select
        label="Provider"
        value={llmProvider}
        onChange={(v) => setLlmProvider(v ?? 'openai')}
        data={[
          { value: 'openai', label: 'OpenAI-Compatible' },
          { value: 'anthropic', label: 'Anthropic' },
        ]}
        disabled={useGlobalLLM}
      />
      <TextInput
        label="Base URL"
        value={llmBaseUrl}
        onChange={(e) => setLlmBaseUrl(e.currentTarget.value)}
        placeholder={llmProvider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}
        disabled={useGlobalLLM}
      />
      <PasswordInput
        label="API Key"
        value={llmApiKey}
        onChange={(e) => setLlmApiKey(e.currentTarget.value)}
        placeholder="sk-..."
        disabled={useGlobalLLM}
      />
      <TextInput
        label="Model"
        value={llmModel}
        onChange={(e) => setLlmModel(e.currentTarget.value)}
        placeholder="claude-sonnet-4-20250514"
        disabled={useGlobalLLM}
      />

      <Group gap="xs">
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlugConnected size={14} />}
          onClick={handleTestConnection}
          loading={testStatus === 'loading'}
          disabled={!agent}
        >
          Test Connection
        </Button>
        {testStatus === 'success' && (
          <Alert color="green" p="xs" style={{ flex: 1 }}>
            <Text size="xs">{testMessage}</Text>
          </Alert>
        )}
        {testStatus === 'error' && (
          <Alert color="red" p="xs" style={{ flex: 1 }}>
            <Text size="xs">{testMessage}</Text>
          </Alert>
        )}
      </Group>

      <Divider my="sm" />

      <Group justify="space-between">
        {onDelete && (
          <Button variant="light" color="red" onClick={onDelete} loading={deleting}>
            Delete Agent
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Button onClick={handleSave} loading={saving}>
          Save
        </Button>
      </Group>
    </Stack>
  );
}
