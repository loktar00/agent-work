import { eq } from "drizzle-orm";
import { skills } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type { CreateSkillInput, UpdateSkillInput } from "@agent-board/shared";
import { newId } from "../utils.js";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

export function skillService(db: DB) {
  return {
    list() {
      return db.select().from(skills).all();
    },

    getById(id: string) {
      return db.select().from(skills).where(eq(skills.id, id)).get();
    },

    create(input: CreateSkillInput) {
      const id = newId();
      const row = {
        id,
        name: input.name,
        description: input.description ?? null,
        filePath: input.filePath ?? null,
        source: input.source ?? null,
      };
      db.insert(skills).values(row).run();
      return row;
    },

    update(id: string, input: UpdateSkillInput) {
      const existing = db
        .select()
        .from(skills)
        .where(eq(skills.id, id))
        .get();
      if (!existing) return null;
      db.update(skills).set(input).where(eq(skills.id, id)).run();
      return db.select().from(skills).where(eq(skills.id, id)).get();
    },

    delete(id: string) {
      const existing = db
        .select()
        .from(skills)
        .where(eq(skills.id, id))
        .get();
      if (!existing) return false;
      db.delete(skills).where(eq(skills.id, id)).run();
      return true;
    },

    scanDirectory(dirPath: string) {
      if (!existsSync(dirPath)) return [];
      const entries = readdirSync(dirPath);
      const discovered: Array<{ name: string; path: string; description: string | null }> = [];

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          const metaPath = join(fullPath, "metadata.json");
          let description: string | null = null;
          if (existsSync(metaPath)) {
            try {
              const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
              description = meta.description ?? null;
            } catch {}
          }
          discovered.push({ name: basename(fullPath), path: fullPath, description });
        }
      }
      return discovered;
    },
  };
}
