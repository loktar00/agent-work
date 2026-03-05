import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { queryKeys } from '../queryKeys';
import type { Run } from '@agent-board/shared';

export function useActiveRuns(boardId: string) {
  return useQuery<Run[]>({
    queryKey: queryKeys.runs.byBoard(boardId),
    queryFn: async () => {
      const allRuns = await api.get<Run[]>(`/api/boards/${boardId}/runs`);
      return allRuns.filter((r) => r.status === 'running' || r.status === 'queued');
    },
    refetchInterval: 5000,
    enabled: !!boardId,
  });
}
