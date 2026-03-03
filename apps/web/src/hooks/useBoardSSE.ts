import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSSE } from './useSSE';
import { queryKeys } from '../api/queryKeys';

export function useBoardSSE(boardId: string | undefined) {
  const qc = useQueryClient();

  const onMessage = useCallback(
    (event: MessageEvent) => {
      if (!boardId) return;
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'card.created':
          case 'card.updated':
          case 'card.moved':
          case 'card.deleted':
            qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId) });
            break;
          case 'column.created':
          case 'column.updated':
          case 'column.reordered':
            qc.invalidateQueries({ queryKey: queryKeys.columns.byBoard(boardId) });
            break;
          case 'agent.updated':
            qc.invalidateQueries({ queryKey: queryKeys.agents.all });
            break;
          case 'activity':
            qc.invalidateQueries({ queryKey: queryKeys.activity.byBoard(boardId) });
            break;
        }
      } catch {
        // ignore non-JSON events
      }
    },
    [boardId, qc],
  );

  useSSE({
    url: `/api/boards/${boardId}/feed`,
    onMessage,
    enabled: !!boardId,
  });
}
