import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { queryKeys } from '../queryKeys';

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents.all,
    queryFn: () => api.get('/api/agents'),
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: queryKeys.agents.detail(id),
    queryFn: () => api.get(`/api/agents/${id}`),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; role: string; persona?: string | null; runnerId?: string | null; modelConfig?: Record<string, unknown> | null; toolPermissions?: Record<string, unknown> | null }) =>
      api.post('/api/agents', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents.all }),
  });
}

export function useUpdateAgent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/api/agents/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.all });
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(id) });
    },
  });
}
