import { Text, type TextProps } from '@mantine/core';
import { useEffect, useState } from 'react';

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface TimeAgoProps extends Omit<TextProps, 'children'> {
  date: string;
}

export function TimeAgo({ date, ...props }: TimeAgoProps) {
  const [text, setText] = useState(() => formatTimeAgo(date));

  useEffect(() => {
    setText(formatTimeAgo(date));
    const interval = setInterval(() => setText(formatTimeAgo(date)), 60_000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <Text size="xs" c="dimmed" {...props}>
      {text}
    </Text>
  );
}
