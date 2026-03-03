import { useState, useCallback } from 'react';
import { useSSE } from './useSSE';

interface RunEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

export function useRunSSE(boardId: string | undefined, runId: string | undefined) {
  const [events, setEvents] = useState<RunEvent[]>([]);

  const onMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      setEvents((prev) => [...prev, { ...data, timestamp: Date.now() }]);
    } catch {
      // ignore non-JSON events
    }
  }, []);

  useSSE({
    url: `/api/boards/${boardId}/runs/${runId}/events`,
    onMessage,
    enabled: !!boardId && !!runId,
  });

  return { events };
}
