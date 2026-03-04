import {
  Container,
  Title,
  Stack,
  Paper,
  Group,
  Text,
  Badge,
  Textarea,
  Button,
  ScrollArea,
  Select,
  Anchor,
} from '@mantine/core';
import { IconSend, IconMessageCircle, IconArrowLeft } from '@tabler/icons-react';
import { useParams, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { useBoard } from '../api/hooks/useBoards';
import { TimeAgo } from '../components/TimeAgo';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { EmptyState } from '../components/EmptyState';
import type { Message } from '@agent-board/shared';

export default function ProjectThreadPage() {
  const { boardId } = useParams();
  const qc = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [authorType, setAuthorType] = useState<string>('human');
  const viewportRef = useRef<HTMLDivElement>(null);
  const { data: board } = useBoard(boardId ?? '') as { data: { id: string; name: string } | undefined };

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: queryKeys.messages.byBoard(boardId!),
    queryFn: () => api.get(`/api/boards/${boardId}/messages`),
    enabled: !!boardId,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/api/messages`, {
        boardId,
        content,
        authorType,
        authorId: authorType === 'human' ? 'user' : 'system',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.messages.byBoard(boardId!) });
      setNewMessage('');
    },
  });

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length]);

  return (
    <Container size="md" h="calc(100vh - 120px)">
      <Stack h="100%" gap="md">
        <Stack gap={4}>
          <Group gap="xs">
            <Anchor component={Link} to={`/boards/${boardId}`} c="dimmed" size="sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconArrowLeft size={14} />
              {board?.name ?? 'Board'}
            </Anchor>
          </Group>
          <Title order={2}>Project Thread</Title>
        </Stack>

        <ScrollArea style={{ flex: 1 }} viewportRef={viewportRef}>
          {messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Start the project conversation."
              icon={<IconMessageCircle size={24} />}
            />
          ) : (
            <Stack gap="xs">
              {messages.map((msg) => (
                <Paper key={msg.id} p="sm" withBorder>
                  <Group gap="xs" justify="space-between" mb={4}>
                    <Group gap="xs">
                      <Badge
                        size="xs"
                        variant="light"
                        color={msg.authorType === 'agent' ? 'green' : 'pink'}
                      >
                        {msg.authorType}
                      </Badge>
                      <Text size="xs" fw={500}>
                        {msg.authorId}
                      </Text>
                    </Group>
                    <TimeAgo date={msg.createdAt} />
                  </Group>
                  <MarkdownRenderer content={msg.content} />
                </Paper>
              ))}
            </Stack>
          )}
        </ScrollArea>

        <Paper p="sm" withBorder>
          <Stack gap="xs">
            <Group align="flex-end" gap="xs">
              <Select
                size="xs"
                data={[
                  { value: 'human', label: 'Human' },
                  { value: 'agent', label: 'Agent' },
                ]}
                value={authorType}
                onChange={(v) => v && setAuthorType(v)}
                w={100}
              />
              <Textarea
                placeholder="Write a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.currentTarget.value)}
                autosize
                minRows={1}
                maxRows={4}
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
                    e.preventDefault();
                    sendMutation.mutate(newMessage.trim());
                  }
                }}
              />
              <Button
                size="sm"
                leftSection={<IconSend size={14} />}
                onClick={() => {
                  if (newMessage.trim()) sendMutation.mutate(newMessage.trim());
                }}
                loading={sendMutation.isPending}
              >
                Send
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
