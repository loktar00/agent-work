import { Grid, Container, Modal, TextInput, Textarea, Select, Stack, Button, Tabs } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent } from '../api/hooks/useAgents';
import { AgentList } from '../components/agents/AgentList';
import { AgentDetailForm } from '../components/agents/AgentDetailForm';
import { AgentDirectory } from '../components/agents/AgentDirectory';
import type { Agent } from '@agent-board/shared';

export default function AgentsPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { data: agents = [] } = useAgents() as { data: Agent[] };
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent(agentId ?? '');
  const deleteAgent = useDeleteAgent(agentId ?? '');

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPersona, setNewPersona] = useState('');
  const [newRunner, setNewRunner] = useState<string | null>(null);

  const selectedAgent = agents.find((a) => a.id === agentId) ?? null;

  const handleCreated = (id: string) => {
    setCreateOpen(false);
    navigate(`/agents/${id}`);
  };

  return (
    <Container fluid>
      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <AgentList
            agents={agents}
            selectedId={agentId}
            onSelect={(id) => navigate(`/agents/${id}`)}
            onCreateClick={() => setCreateOpen(true)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <AgentDetailForm
            agent={selectedAgent}
            onSave={(data) => updateAgent.mutate(data)}
            onDelete={() => {
              deleteAgent.mutate(undefined, {
                onSuccess: () => navigate('/agents'),
              });
            }}
            saving={updateAgent.isPending}
            deleting={deleteAgent.isPending}
          />
        </Grid.Col>
      </Grid>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Agent"
        centered
        size="xl"
        data-testid="create-agent-modal"
      >
        <Tabs defaultValue="templates">
          <Tabs.List>
            <Tabs.Tab value="templates">Templates</Tabs.Tab>
            <Tabs.Tab value="custom" data-testid="custom-tab">Custom</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="templates" pt="md">
            <AgentDirectory onCreated={handleCreated} />
          </Tabs.Panel>

          <Tabs.Panel value="custom" pt="md">
            <Stack gap="md">
              <TextInput
                label="Name"
                value={newName}
                onChange={(e) => setNewName(e.currentTarget.value)}
                placeholder="Agent name..."
                data-testid="agent-name-input"
              />
              <TextInput
                label="Role"
                value={newRole}
                onChange={(e) => setNewRole(e.currentTarget.value)}
                placeholder="e.g., developer, reviewer..."
                data-testid="agent-role-input"
              />
              <Select
                label="Runner"
                value={newRunner}
                onChange={setNewRunner}
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
              <Textarea
                label="Persona / System Prompt"
                value={newPersona}
                onChange={(e) => setNewPersona(e.currentTarget.value)}
                placeholder="Paste the full agent prompt or markdown document here..."
                autosize
                minRows={10}
                maxRows={20}
                data-testid="agent-persona-input"
              />
              <Button
                data-testid="agent-create-btn"
                onClick={() => {
                  if (newName.trim() && newRole.trim()) {
                    createAgent.mutate(
                      {
                        name: newName.trim(),
                        role: newRole.trim(),
                        persona: newPersona.trim() || null,
                        runnerId: newRunner,
                      },
                      {
                        onSuccess: () => {
                          setCreateOpen(false);
                          setNewName('');
                          setNewRole('');
                          setNewPersona('');
                          setNewRunner(null);
                        },
                      },
                    );
                  }
                }}
                loading={createAgent.isPending}
              >
                Create
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </Container>
  );
}
