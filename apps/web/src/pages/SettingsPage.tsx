import {
  Container,
  Title,
  Paper,
  Select,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Text,
  Alert,
  Stack,
  Divider,
} from '@mantine/core';
import { IconSettings, IconCheck, IconX, IconPlugConnected } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface LLMSettingsResponse {
  configured: boolean;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export default function SettingsPage() {
  const [provider, setProvider] = useState<string>('openai');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<LLMSettingsResponse>('/api/settings/llm').then((data) => {
      if (data.configured) {
        setProvider(data.provider ?? 'openai');
        setBaseUrl(data.baseUrl ?? '');
        // Don't set masked API key — leave it blank so user knows to re-enter
        setModel(data.model ?? '');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.post<{ ok: boolean; error?: string }>('/api/settings/llm/test', {
        provider,
        baseUrl,
        apiKey,
        model,
      });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ ok: false, error: err.body?.error ?? err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      await api.put('/api/settings/llm', {
        provider,
        baseUrl,
        apiKey,
        model,
      });
      setSaveResult({ ok: true });
    } catch (err: any) {
      setSaveResult(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Container size="sm" py="xl">
      <Group mb="lg" gap="sm">
        <IconSettings size={28} style={{ color: 'var(--mantine-color-cyan-5)' }} />
        <Title order={2} style={{ color: 'var(--mantine-color-cyan-4)' }}>Settings</Title>
      </Group>

      <Paper
        p="lg"
        radius="md"
        style={{
          backgroundColor: 'rgba(10, 10, 20, 0.8)',
          border: '1px solid rgba(0, 255, 242, 0.15)',
        }}
      >
        <Title order={4} mb="md" c="cyan.4">LLM Provider Configuration</Title>
        <Text size="sm" c="dimmed" mb="lg">
          Configure which LLM provider the orchestrator uses. Supports OpenAI-compatible APIs (OpenAI, ollama, litellm, vllm) and Anthropic.
        </Text>

        <Stack gap="md">
          <Select
            label="Provider"
            data={[
              { value: 'openai', label: 'OpenAI-Compatible' },
              { value: 'anthropic', label: 'Anthropic' },
            ]}
            value={provider}
            onChange={(v) => {
              setProvider(v ?? 'openai');
              setTestResult(null);
              setSaveResult(null);
              if (v === 'anthropic') {
                setBaseUrl('https://api.anthropic.com');
              } else if (!baseUrl || baseUrl === 'https://api.anthropic.com') {
                setBaseUrl('');
              }
            }}
          />

          <TextInput
            label="Base URL"
            placeholder={
              provider === 'anthropic'
                ? 'https://api.anthropic.com'
                : 'https://api.openai.com/v1 or http://localhost:11434/v1'
            }
            value={baseUrl}
            onChange={(e) => { setBaseUrl(e.currentTarget.value); setTestResult(null); setSaveResult(null); }}
            description={
              provider === 'anthropic'
                ? 'Anthropic API endpoint (default: https://api.anthropic.com)'
                : 'OpenAI-compatible API base URL'
            }
          />

          <PasswordInput
            label="API Key"
            placeholder="sk-... or leave empty for local models"
            value={apiKey}
            onChange={(e) => { setApiKey(e.currentTarget.value); setTestResult(null); setSaveResult(null); }}
            description="Your API key. Leave empty for local models that don't require auth."
          />

          <TextInput
            label="Model"
            placeholder={
              provider === 'anthropic'
                ? 'claude-sonnet-4-20250514'
                : 'gpt-4o, llama3, mistral, etc.'
            }
            value={model}
            onChange={(e) => { setModel(e.currentTarget.value); setTestResult(null); setSaveResult(null); }}
            description="The model identifier to use"
          />

          <Divider />

          {testResult && (
            <Alert
              icon={testResult.ok ? <IconCheck size={16} /> : <IconX size={16} />}
              color={testResult.ok ? 'green' : 'red'}
              variant="light"
            >
              {testResult.ok
                ? 'Connection successful!'
                : `Connection failed: ${testResult.error}`}
            </Alert>
          )}

          {saveResult?.ok && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              Settings saved successfully!
            </Alert>
          )}

          <Group>
            <Button
              variant="light"
              color="cyan"
              leftSection={<IconPlugConnected size={16} />}
              onClick={handleTest}
              loading={testing}
              disabled={!baseUrl || !model}
            >
              Test Connection
            </Button>
            <Button
              color="cyan"
              onClick={handleSave}
              loading={saving}
              disabled={!baseUrl || !model}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
