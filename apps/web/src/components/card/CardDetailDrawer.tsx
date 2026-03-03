import {
  Drawer,
  TextInput,
  Stack,
  Group,
  Select,
  Tabs,
  Button,
  ActionIcon,
} from '@mantine/core';
import {
  IconChecklist,
  IconShield,
  IconFile,
  IconMessage,
  IconHistory,
  IconArrowsMove,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import type { Card, Agent } from '@agent-board/shared';
import { CardStatus } from '@agent-board/shared';
import { StatusBadge } from '../StatusBadge';
import { SubtaskList } from './SubtaskList';
import { AcceptanceCriteriaList } from './AcceptanceCriteriaList';
import { ArtifactsList } from './ArtifactsList';
import { DiscussionThread } from './DiscussionThread';
import { RunHistory } from './RunHistory';

interface CardDetailDrawerProps {
  card: Card | null;
  agents: Agent[];
  opened: boolean;
  onClose: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateStatus: (status: string) => void;
  onUpdateAssignee: (agentId: string | null) => void;
}

const statusOptions = Object.values(CardStatus).map((s) => ({
  value: s,
  label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}));

export function CardDetailDrawer({
  card,
  agents,
  opened,
  onClose,
  onUpdateTitle,
  onUpdateStatus,
  onUpdateAssignee,
}: CardDetailDrawerProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  if (!card) return null;

  const agentOptions = agents.map((a) => ({ value: a.id, label: a.name }));

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <StatusBadge status={card.status} />
        </Group>
      }
      position="right"
      size="lg"
    >
      <Stack gap="md">
        {editingTitle ? (
          <TextInput
            value={titleValue}
            onChange={(e) => setTitleValue(e.currentTarget.value)}
            onBlur={() => {
              if (titleValue.trim() && titleValue !== card.title) {
                onUpdateTitle(titleValue.trim());
              }
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === 'Escape') setEditingTitle(false);
            }}
            autoFocus
            size="lg"
          />
        ) : (
          <TextInput
            value={card.title}
            readOnly
            size="lg"
            onClick={() => {
              setTitleValue(card.title);
              setEditingTitle(true);
            }}
            styles={{ input: { cursor: 'pointer' } }}
          />
        )}

        <Group grow>
          <Select
            label="Status"
            data={statusOptions}
            value={card.status}
            onChange={(v) => v && onUpdateStatus(v)}
          />
          <Select
            label="Assignee"
            data={agentOptions}
            value={card.assigneeAgentId}
            onChange={onUpdateAssignee}
            clearable
            placeholder="Unassigned"
          />
        </Group>

        <Tabs defaultValue="subtasks">
          <Tabs.List>
            <Tabs.Tab value="subtasks" leftSection={<IconChecklist size={14} />}>
              Subtasks
            </Tabs.Tab>
            <Tabs.Tab value="criteria" leftSection={<IconShield size={14} />}>
              Criteria
            </Tabs.Tab>
            <Tabs.Tab value="artifacts" leftSection={<IconFile size={14} />}>
              Artifacts
            </Tabs.Tab>
            <Tabs.Tab value="discussion" leftSection={<IconMessage size={14} />}>
              Discussion
            </Tabs.Tab>
            <Tabs.Tab value="runs" leftSection={<IconHistory size={14} />}>
              Runs
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="subtasks" pt="sm">
            <SubtaskList cardId={card.id} />
          </Tabs.Panel>
          <Tabs.Panel value="criteria" pt="sm">
            <AcceptanceCriteriaList cardId={card.id} />
          </Tabs.Panel>
          <Tabs.Panel value="artifacts" pt="sm">
            <ArtifactsList cardId={card.id} />
          </Tabs.Panel>
          <Tabs.Panel value="discussion" pt="sm">
            <DiscussionThread cardId={card.id} />
          </Tabs.Panel>
          <Tabs.Panel value="runs" pt="sm">
            <RunHistory cardId={card.id} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Drawer>
  );
}
