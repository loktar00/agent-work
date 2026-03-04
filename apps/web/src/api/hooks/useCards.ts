import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { queryKeys } from '../queryKeys';

export function useCards(boardId: string) {
  return useQuery({
    queryKey: queryKeys.cards.byBoard(boardId),
    queryFn: () => api.get(`/api/boards/${boardId}/cards`),
    enabled: !!boardId,
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: queryKeys.cards.detail(id),
    queryFn: () => api.get(`/api/cards/${id}`),
    enabled: !!id,
  });
}

export function useCreateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; columnId: string; description?: string }) =>
      api.post(`/api/boards/${boardId}/cards`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId) }),
  });
}

export function useMoveCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { cardId: string; columnId: string; position: number }) =>
      api.post(`/api/cards/${data.cardId}/move`, {
        columnId: data.columnId,
        position: data.position,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId) }),
  });
}

export function useDeleteCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => api.delete(`/api/cards/${cardId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId) }),
  });
}
