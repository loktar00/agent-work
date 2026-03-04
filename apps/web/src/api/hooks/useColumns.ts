import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { queryKeys } from '../queryKeys';

export function useColumns(boardId: string) {
  return useQuery({
    queryKey: queryKeys.columns.byBoard(boardId),
    queryFn: () => api.get(`/api/boards/${boardId}/columns`),
    enabled: !!boardId,
  });
}

export function useReorderColumns(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnIds: string[]) =>
      api.post(`/api/boards/${boardId}/columns/reorder`, { orderedIds: columnIds }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.columns.byBoard(boardId) }),
  });
}

export function useCreateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; position: number }) =>
      api.post(`/api/boards/${boardId}/columns`, { ...data, boardId }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.columns.byBoard(boardId) }),
  });
}
