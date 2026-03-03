import { Badge, type BadgeProps } from '@mantine/core';
import { IconRobot } from '@tabler/icons-react';

interface AgentBadgeProps extends Omit<BadgeProps, 'children'> {
  name: string;
}

export function AgentBadge({ name, ...props }: AgentBadgeProps) {
  return (
    <Badge
      leftSection={<IconRobot size={12} />}
      variant="light"
      color="green"
      size="sm"
      {...props}
    >
      {name}
    </Badge>
  );
}
