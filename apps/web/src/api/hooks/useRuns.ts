import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useCreateRun(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      cardId: string;
      agentId: string;
      runnerId?: string | null;
      prompt?: string | null;
    }) =>
      api.post<Run>('/api/runs', {
        boardId,
        ...data,
      }),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: queryKeys.runs.byBoard(boardId) });
      qc.invalidateQueries({ queryKey: queryKeys.runs.byCard(run.cardId) });
    },
  });
}

export function useCancelRun(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => api.post<Run>(`/api/runs/${runId}/cancel`),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: queryKeys.runs.byBoard(boardId) });
      qc.invalidateQueries({ queryKey: queryKeys.runs.byCard(run.cardId) });
    },
  });
}
