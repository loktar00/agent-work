import { Badge, Group, Loader, Modal, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { useSSE } from '../../hooks/useSSE';
import type { Run, RunEvent } from '@agent-board/shared';
import styles from './RunLogViewer.module.css';

interface RunLogViewerProps {
  runId: string | null;
  onClose: () => void;
}

export function RunLogViewer({ runId, onClose }: RunLogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: run } = useQuery<Run>({
    queryKey: ['runs', runId],
    queryFn: () => api.get<Run>(`/api/runs/${runId}`),
    enabled: !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'running' || status === 'queued' ? 3000 : false;
    },
  });

  const { data: events = [], refetch: refetchEvents } = useQuery<RunEvent[]>({
    queryKey: ['runs', runId, 'events'],
    queryFn: () => api.get<RunEvent[]>(`/api/runs/${runId}/events`),
    enabled: !!runId,
    refetchInterval: (query) => {
      // Keep polling if the run is active
      return run?.status === 'running' || run?.status === 'queued' ? 2000 : false;
    },
  });

  // SSE for live streaming events
  const onSSEMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'run:output' && data.runId === runId) {
          refetchEvents();
        }
      } catch {
        // ignore
      }
    },
    [runId, refetchEvents],
  );

  useSSE({
    url: run ? `/api/boards/${run.boardId}/feed` : '/api/boards/_/feed',
    onMessage: onSSEMessage,
    enabled: !!run && (run.status === 'running' || run.status === 'queued'),
  });

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [events.length]);

  const statusColor =
    run?.status === 'running'
      ? 'cyan'
      : run?.status === 'queued'
        ? 'yellow'
        : run?.status === 'completed'
          ? 'green'
          : 'red';

  return (
    <Modal
      opened={!!runId}
      onClose={onClose}
      title="Run Log"
      size="xl"
      centered
      styles={{
        header: {
          background: 'rgba(5, 5, 15, 0.98)',
          borderBottom: '1px solid #1a1a2e',
        },
        body: {
          background: 'rgba(5, 5, 15, 0.98)',
          padding: 0,
        },
        content: {
          background: 'rgba(5, 5, 15, 0.98)',
          border: '1px solid #1a1a2e',
        },
      }}
    >
      {run && (
        <div className={styles.statusBar}>
          <Badge size="sm" color={statusColor} variant="dot">
            {run.status}
          </Badge>
          <Text size="xs" c="dimmed">
            Run {run.id.slice(0, 8)}
          </Text>
          {run.status === 'running' && <Loader size="xs" color="cyan" />}
        </div>
      )}

      <div className={styles.logContainer} ref={scrollRef}>
        {events.length === 0 && (
          <div className={styles.emptyLog}>
            {run?.status === 'queued' ? 'Waiting to start...' : 'No output yet'}
          </div>
        )}
        {events.map((evt) => {
          let lineClass = styles.logLine;
          if (evt.type === 'stdout') lineClass += ` ${styles.logLineStdout}`;
          else if (evt.type === 'stderr') lineClass += ` ${styles.logLineStderr}`;
          else lineClass += ` ${styles.logLineSystem}`;

          return (
            <div key={evt.id} className={lineClass}>
              {evt.data}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
