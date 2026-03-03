import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { cards } from "./cards.ts";
import { agents } from "./agents.ts";

export const leases = sqliteTable(
  "leases",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    renewedAt: text("renewed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("leases_card_id_idx").on(table.cardId),
    index("leases_expires_at_idx").on(table.expiresAt),
  ],
);
