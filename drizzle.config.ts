import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/db/src/schema/*",
  out: "./packages/db/src/migrations",
  dialect: "sqlite",
  dbCredentials: { url: "./data/agent-board.db" },
});
