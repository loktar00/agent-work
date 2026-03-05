import type { DB } from "@agent-board/db";
import { cardService } from "./cards.js";
import { subtaskService } from "./subtasks.js";
import { messageService } from "./messages.js";
import { artifactService } from "./artifacts.js";
import { agentService } from "./agents.js";

export function contextBuilder(db: DB) {
  const cards = cardService(db);
  const subtasks = subtaskService(db);
  const msgs = messageService(db);
  const arts = artifactService(db);
  const agents = agentService(db);

  return {
    buildCardContext(cardId: string, messageLimit = 20) {
      const card = cards.getById(cardId);
      if (!card) return null;

      const cardSubtasks = subtasks.listByCard(cardId);
      const rawMessages = msgs.listByCard(cardId, messageLimit);
      const artifacts = arts.listByCard(cardId);

      // Enrich messages with agent names
      const agentCache = new Map<string, string>();
      const recentMessages = rawMessages.map((m) => {
        if (m.authorType === "agent" && m.authorId) {
          if (!agentCache.has(m.authorId)) {
            const agent = agents.getById(m.authorId);
            agentCache.set(m.authorId, agent?.name ?? m.authorId);
          }
          return { ...m, authorName: agentCache.get(m.authorId) };
        }
        return { ...m, authorName: m.authorId };
      });

      return {
        card,
        subtasks: cardSubtasks,
        recentMessages,
        artifacts,
      };
    },
  };
}
