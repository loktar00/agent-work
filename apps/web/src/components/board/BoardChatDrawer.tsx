import {
  ActionIcon,
  Badge,
  Group,
  Text,
  Textarea,
  Button,
  Loader,
  SegmentedControl,
  MultiSelect,
} from '@mantine/core';
import {
  IconChevronDown,
  IconMessageCircle,
  IconSend,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { useUIStore } from '../../stores/uiStore';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { TimeAgo } from '../TimeAgo';
import type { Message, Agent } from '@agent-board/shared';
import styles from './BoardChatDrawer.module.css';

interface BoardChatDrawerProps {
  boardId: string;
  commandingAgentName?: string;
}

interface OrchestratorResponse {
  message: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown>; result: unknown }>;
  userMessage: Message;
}

interface MultiChatResponse {
  userMessage: Message;
  results: Array<{
    agentId: string;
    agentName: string;
    message: string;
    toolCalls: Array<{ name: string; input: unknown; result: unknown }>;
  }>;
  rounds: number;
}

export function BoardChatDrawer({ boardId, commandingAgentName }: BoardChatDrawerProps) {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.boardChatOpen);
  const height = useUIStore((s) => s.boardChatHeight);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setBoardChatHeight = useUIStore((s) => s.setBoardChatHeight);
  const toggleBoardChat = useUIStore((s) => s.toggleBoardChat);

  const [input, setInput] = useState('');
  const [chatMode, setChatMode] = useState<'orchestrator' | 'multi-agent'>('orchestrator');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const qc = useQueryClient();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: queryKeys.messages.byBoard(boardId),
    queryFn: () => api.get(`/api/boards/${boardId}/messages`),
    enabled: open,
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: queryKeys.agents.all,
    queryFn: () => api.get('/api/agents'),
    enabled: open && chatMode === 'multi-agent',
  });

  const orchestrate = useMutation<OrchestratorResponse, Error, string>({
    mutationFn: async (message: string) => {
      return api.post<OrchestratorResponse>(
        `/api/boards/${boardId}/orchestrate`,
        { message },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.messages.byBoard(boardId) });
      qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId) });
      qc.invalidateQueries({ queryKey: queryKeys.columns.byBoard(boardId) });
    },
  });

  const multiChat = useMutation<MultiChatResponse, Error, string>({
    mutationFn: async (message: string) => {
      return api.post<MultiChatResponse>(
        `/api/boards/${boardId}/multi-chat`,
        { message, agentIds: selectedAgentIds },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.messages.byBoard(boardId) });
      qc.invalidateQueries({ queryKey: queryKeys.cards.byBoard(boardId) });
      qc.invalidateQueries({ queryKey: queryKeys.columns.byBoard(boardId) });
    },
  });

  const isPending = orchestrate.isPending || multiChat.isPending;

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (chatMode === 'multi-agent' && selectedAgentIds.length > 0) {
      multiChat.mutate(text);
    } else {
      orchestrate.mutate(text);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isPending]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current = height;

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = startYRef.current - ev.clientY;
        setBoardChatHeight(startHeightRef.current + delta);
      };

      const onMouseUp = () => {
        resizingRef.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [height, setBoardChatHeight],
  );

  if (!open) return null;

  return (
    <div
      className={`${styles.drawer} ${!sidebarOpen ? styles.drawerCollapsed : ''}`}
      style={{ height }}
    >
      <div className={styles.resizeHandle} onMouseDown={handleMouseDown} />

      <div className={styles.header}>
        <span className={styles.headerTitle}>
          Board Chat{commandingAgentName ? `: ${commandingAgentName}` : ''}
        </span>
        <SegmentedControl
          size="xs"
          value={chatMode}
          onChange={(v) => setChatMode(v as 'orchestrator' | 'multi-agent')}
          data={[
            { value: 'orchestrator', label: 'PM' },
            { value: 'multi-agent', label: 'Multi-Agent' },
          ]}
          style={{ marginLeft: 8, marginRight: 8 }}
        />
        <ActionIcon size="xs" variant="subtle" color="gray" onClick={toggleBoardChat}>
          <IconChevronDown size={14} />
        </ActionIcon>
      </div>

      {chatMode === 'multi-agent' && (
        <div style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <MultiSelect
            size="xs"
            placeholder="Select agents for discussion..."
            data={agents.map((a) => ({ value: a.id, label: `${a.name} (${a.role})` }))}
            value={selectedAgentIds}
            onChange={setSelectedAgentIds}
            searchable
            maxDropdownHeight={200}
          />
        </div>
      )}

      <div className={styles.messages}>
        {messages
          .filter((m) => !m.cardId)
          .map((msg) => (
            <div key={msg.id} className={styles.message}>
              <Group gap="xs" justify="space-between" mb={2}>
                <Group gap="xs">
                  <Badge
                    size="xs"
                    variant="light"
                    color={msg.authorType === 'agent' ? 'cyan' : 'pink'}
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
            </div>
          ))}

        {isPending && (
          <div className={styles.loadingDots}>
            <span /><span /><span />
            <Text size="xs" c="dimmed" ml={8}>
              {chatMode === 'multi-agent' ? 'Agents discussing...' : 'Thinking...'}
            </Text>
          </div>
        )}

        {orchestrate.isError && orchestrate.error?.message?.includes('400') && (
          <div className={styles.message}>
            <Text size="sm" c="yellow" mb={4}>LLM provider not configured.</Text>
            <Button
              size="xs"
              variant="light"
              color="cyan"
              leftSection={<IconSettings size={14} />}
              onClick={() => navigate('/settings')}
            >
              Configure in Settings
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <Textarea
          placeholder={commandingAgentName ? `Ask ${commandingAgentName}...` : 'Ask the PM orchestrator...'}
          size="xs"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          autosize
          minRows={1}
          maxRows={3}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isPending}
        />
        <Button
          size="xs"
          leftSection={<IconSend size={12} />}
          onClick={handleSend}
          loading={isPending}
          disabled={chatMode === 'multi-agent' && selectedAgentIds.length === 0}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

export function BoardChatToggle() {
  const toggle = useUIStore((s) => s.toggleBoardChat);

  return (
    <ActionIcon
      variant="light"
      color="cyan"
      size="sm"
      onClick={toggle}
      title="Toggle Board Chat"
    >
      <IconMessageCircle size={14} />
    </ActionIcon>
  );
}
