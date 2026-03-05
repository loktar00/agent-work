import {
  Drawer,
  TextInput,
  Stack,
  Group,
  Select,
  Accordion,
  Button,
} from '@mantine/core';
import {
  IconChecklist,
  IconFile,
  IconMessage,
  IconHistory,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import type { Card, Agent } from '@agent-board/shared';
import { CardStatus } from '@agent-board/shared';
import { useDeleteCard } from '../../api/hooks/useCards';
import { StatusBadge } from '../StatusBadge';
import { SubtaskList } from './SubtaskList';
import { ArtifactsList } from './ArtifactsList';
import { DiscussionThread } from './DiscussionThread';
import { RunHistory } from './RunHistory';

interface CardDetailDrawerProps {
  card: Card | null;
  agents: Agent[];
  boardId: string;
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
  boardId,
  opened,
  onClose,
  onUpdateTitle,
  onUpdateStatus,
  onUpdateAssignee,
}: CardDetailDrawerProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const deleteCard = useDeleteCard(boardId);

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

        <Accordion
          multiple
          defaultValue={['subtasks', 'artifacts', 'discussion', 'runs']}
          variant="separated"
        >
          <Accordion.Item value="subtasks">
            <Accordion.Control icon={<IconChecklist size={16} />}>
              Subtasks
            </Accordion.Control>
            <Accordion.Panel>
              <SubtaskList cardId={card.id} />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="artifacts">
            <Accordion.Control icon={<IconFile size={16} />}>
              Artifacts
            </Accordion.Control>
            <Accordion.Panel>
              <ArtifactsList cardId={card.id} />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="discussion">
            <Accordion.Control icon={<IconMessage size={16} />}>
              Discussion
            </Accordion.Control>
            <Accordion.Panel>
              <DiscussionThread cardId={card.id} boardId={boardId} />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="runs">
            <Accordion.Control icon={<IconHistory size={16} />}>
              Runs
            </Accordion.Control>
            <Accordion.Panel>
              <RunHistory cardId={card.id} />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <Button
          color="red"
          variant="light"
          leftSection={<IconTrash size={16} />}
          loading={deleteCard.isPending}
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this card?')) {
              deleteCard.mutate(card.id, {
                onSuccess: () => onClose(),
              });
            }
          }}
          data-testid="delete-card-btn"
        >
          Delete Card
        </Button>
      </Stack>
    </Drawer>
  );
}
