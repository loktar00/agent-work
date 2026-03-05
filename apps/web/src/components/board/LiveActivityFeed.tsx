import { ActionIcon, Badge, Group, Stack, Text } from '@mantine/core';
import { IconActivity, IconX } from '@tabler/icons-react';
import { TimeAgo } from '../TimeAgo';
import type { Run } from '@agent-board/shared';
import styles from './LiveActivityFeed.module.css';

interface LiveActivityFeedProps {
  open: boolean;
  onToggle: () => void;
  runs: Run[];
  agentNames: Record<string, string>;
  onRunClick?: (runId: string) => void;
}

export function LiveActivityFeed({
  open,
  onToggle,
  runs,
  agentNames,
  onRunClick,
}: LiveActivityFeedProps) {
  return (
    <>
      <ActionIcon
        className={styles.toggleBtn}
        variant="light"
        color="cyan"
        size="md"
        onClick={onToggle}
        title="Toggle Activity Feed"
      >
        <IconActivity size={16} />
      </ActionIcon>

      <div className={`${styles.panel}${open ? ` ${styles.panelOpen}` : ''}`}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Live Activity</span>
          <ActionIcon size="xs" variant="subtle" color="gray" onClick={onToggle}>
            <IconX size={14} />
          </ActionIcon>
        </div>

        <div className={styles.events}>
          {runs.length === 0 && (
            <div className={styles.emptyState}>No active runs</div>
          )}
          {runs.map((run) => (
            <div
              key={run.id}
              className={`${styles.event} ${
                run.status === 'running' ? styles.eventRunning : styles.eventQueued
              }`}
              onClick={() => onRunClick?.(run.id)}
            >
              <Stack gap={4}>
                <Group gap="xs" justify="space-between">
                  <Badge
                    size="xs"
                    variant="dot"
                    color={run.status === 'running' ? 'cyan' : 'pink'}
                  >
                    {run.status}
                  </Badge>
                  {run.startedAt && <TimeAgo date={run.startedAt} />}
                </Group>
                <Text size="xs" fw={500} lineClamp={1}>
                  {agentNames[run.agentId] ?? 'Agent'}
                </Text>
                {run.prompt && (
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {run.prompt}
                  </Text>
                )}
              </Stack>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
