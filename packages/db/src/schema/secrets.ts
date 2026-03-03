import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const secrets = sqliteTable("secrets", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  encryptedValue: text("encrypted_value").notNull(),
  iv: text("iv").notNull(),
  createdAt: text("created_at").notNull(),
});
