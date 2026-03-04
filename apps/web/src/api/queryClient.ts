import { QueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      onError: (error: unknown) => {
        notifications.show({
          title: 'Error',
          message: error instanceof Error ? error.message : 'Something went wrong',
          color: 'red',
        });
      },
    },
  },
});
