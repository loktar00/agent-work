export const queryKeys = {
  boards: {
    all: ['boards'] as const,
    detail: (id: string) => ['boards', id] as const,
  },
  columns: {
    byBoard: (boardId: string) => ['boards', boardId, 'columns'] as const,
  },
  cards: {
    byBoard: (boardId: string) => ['boards', boardId, 'cards'] as const,
    detail: (id: string) => ['cards', id] as const,
  },
  agents: {
    all: ['agents'] as const,
    detail: (id: string) => ['agents', id] as const,
  },
  skills: {
    all: ['skills'] as const,
  },
  runs: {
    byCard: (cardId: string) => ['cards', cardId, 'runs'] as const,
  },
  messages: {
    byCard: (cardId: string) => ['cards', cardId, 'messages'] as const,
    byBoard: (boardId: string) => ['boards', boardId, 'messages'] as const,
  },
  artifacts: {
    byCard: (cardId: string) => ['cards', cardId, 'artifacts'] as const,
  },
  activity: {
    byBoard: (boardId: string) => ['boards', boardId, 'activity'] as const,
  },
};
