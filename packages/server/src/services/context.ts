import type { DB } from "@agent-board/db";
import { cardService } from "./cards.js";
import { subtaskService } from "./subtasks.js";
import { acceptanceCriteriaService } from "./acceptance-criteria.js";
import { messageService } from "./messages.js";
import { artifactService } from "./artifacts.js";

export function contextBuilder(db: DB) {
  const cards = cardService(db);
  const subtasks = subtaskService(db);
  const criteria = acceptanceCriteriaService(db);
  const msgs = messageService(db);
  const arts = artifactService(db);

  return {
    buildCardContext(cardId: string, messageLimit = 20) {
      const card = cards.getById(cardId);
      if (!card) return null;

      const cardSubtasks = subtasks.listByCard(cardId);
      const acceptanceCriteria = criteria.listByCard(cardId);
      const recentMessages = msgs.listByCard(cardId, messageLimit);
      const artifacts = arts.listByCard(cardId);

      return {
        card,
        subtasks: cardSubtasks,
        acceptanceCriteria,
        recentMessages,
        artifacts,
      };
    },
  };
}
