import { Stack, Group, Text, Paper, Textarea, Button, Badge } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { useState } from 'react';
import type { Message } from '@agent-board/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { TimeAgo } from '../TimeAgo';
import { EmptyState } from '../EmptyState';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface DiscussionThreadProps {
  cardId: string;
}

export function DiscussionThread({ cardId }: DiscussionThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const qc = useQueryClient();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: queryKeys.messages.byCard(cardId),
    queryFn: () => api.get(`/api/cards/${cardId}/messages`),
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/api/cards/${cardId}/messages`, {
        content,
        authorType: 'human',
        authorId: 'user',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.messages.byCard(cardId) });
      setNewMessage('');
    },
  });

  return (
    <Stack gap="sm">
      {messages.length === 0 ? (
        <EmptyState title="No messages" description="Start the conversation." />
      ) : (
        messages.map((msg) => (
          <Paper key={msg.id} p="xs" withBorder>
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
        ))
      )}

      <Group align="flex-end" gap="xs">
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
  );
}
