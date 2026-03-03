import { ScrollArea, Code, Box } from '@mantine/core';
import { useRef, useEffect } from 'react';

interface LogViewerProps {
  lines: string[];
  maxHeight?: number;
  autoScroll?: boolean;
}

export function LogViewer({ lines, maxHeight = 400, autoScroll = true }: LogViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [lines.length, autoScroll]);

  return (
    <ScrollArea h={maxHeight} viewportRef={viewportRef}>
      <Box p="xs" bg="var(--ab-surface-0)" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
        <Code block style={{ whiteSpace: 'pre-wrap', background: 'transparent' }}>
          {lines.join('\n')}
        </Code>
      </Box>
    </ScrollArea>
  );
}
