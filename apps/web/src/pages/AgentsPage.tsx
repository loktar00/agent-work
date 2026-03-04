import { Grid, Container, Modal, TextInput, Stack, Button } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAgents, useCreateAgent, useUpdateAgent } from '../api/hooks/useAgents';
import { AgentList } from '../components/agents/AgentList';
import { AgentDetailForm } from '../components/agents/AgentDetailForm';
import type { Agent } from '@agent-board/shared';

export default function AgentsPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { data: agents = [] } = useAgents() as { data: Agent[] };
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent(agentId ?? '');

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');

  const selectedAgent = agents.find((a) => a.id === agentId) ?? null;

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
            saving={updateAgent.isPending}
          />
        </Grid.Col>
      </Grid>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Agent"
        centered
        data-testid="create-agent-modal"
      >
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
          <Button
            data-testid="agent-create-btn"
            onClick={() => {
              if (newName.trim() && newRole.trim()) {
                createAgent.mutate(
                  { name: newName.trim(), role: newRole.trim() },
                  {
                    onSuccess: () => {
                      setCreateOpen(false);
                      setNewName('');
                      setNewRole('');
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
      </Modal>
    </Container>
  );
}
