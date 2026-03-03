import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { queryKeys } from '../queryKeys';

export function useBoards() {
  return useQuery({
    queryKey: queryKeys.boards.all,
    queryFn: () => api.get('/api/boards'),
  });
}

export function useBoard(id: string) {
  return useQuery({
    queryKey: queryKeys.boards.detail(id),
    queryFn: () => api.get(`/api/boards/${id}`),
    enabled: !!id,
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post('/api/boards', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.boards.all }),
  });
}
