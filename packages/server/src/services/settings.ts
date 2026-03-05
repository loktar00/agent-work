import { eq } from "drizzle-orm";
import { settings } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type { LLMSettings } from "@agent-board/shared";

export function settingsService(db: DB) {
  return {
    get<T>(key: string): T | null {
      const row = db.select().from(settings).where(eq(settings.key, key)).get();
      if (!row) return null;
      return JSON.parse(row.value) as T;
    },

    set<T>(key: string, value: T): void {
      const json = JSON.stringify(value);
      const now = new Date().toISOString();
      db.insert(settings)
        .values({ key, value: json, updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: json, updatedAt: now },
        })
        .run();
    },

    getLLMSettings(): LLMSettings | null {
      return this.get<LLMSettings>("llm");
    },

    setLLMSettings(llmSettings: LLMSettings): void {
      this.set("llm", llmSettings);
    },
  };
}
