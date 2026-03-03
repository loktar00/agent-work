import { Stack, Text, ThemeIcon } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Stack align="center" justify="center" gap="md" py="xl">
      <ThemeIcon size={48} variant="light" color="gray" radius="xl">
        {icon ?? <IconInbox size={24} />}
      </ThemeIcon>
      <Text fw={500} size="lg">
        {title}
      </Text>
      {description && (
        <Text size="sm" c="dimmed" ta="center" maw={400}>
          {description}
        </Text>
      )}
      {action}
    </Stack>
  );
}
