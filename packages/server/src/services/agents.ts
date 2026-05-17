import { eq } from "drizzle-orm";
import { agents, agentSkills, skills } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type { CreateAgentInput, UpdateAgentInput, LLMSettings } from "@agent-board/shared";
import { newId, now } from "../utils.js";
import type { settingsService } from "./settings.js";

type AgentRow = typeof agents.$inferSelect;

function parseJsonObject<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function serializeJson(value: Record<string, unknown> | null | undefined) {
  return value ? JSON.stringify(value) : null;
}

export function normalizeAgent(row: AgentRow | undefined) {
  if (!row) return null;
  return {
    ...row,
    modelConfig: parseJsonObject<Record<string, unknown>>(row.modelConfig),
    llmConfig: parseJsonObject<LLMSettings>(row.llmConfig),
    toolPermissions: parseJsonObject<Record<string, unknown>>(row.toolPermissions),
  };
}

export function agentService(db: DB, settingsSvc?: ReturnType<typeof settingsService>) {
  return {
    list() {
      return db.select().from(agents).all().map((row) => normalizeAgent(row)!);
    },

    getById(id: string) {
      return normalizeAgent(
        db.select().from(agents).where(eq(agents.id, id)).get(),
      );
    },

    create(input: CreateAgentInput) {
      const id = newId();
      const ts = now();
      const row = {
        id,
        name: input.name,
        role: input.role,
        persona: input.persona ?? null,
        runnerId: input.runnerId ?? null,
        modelConfig: serializeJson(input.modelConfig),
        llmConfig: input.llmConfig ? JSON.stringify(input.llmConfig) : null,
        toolPermissions: serializeJson(input.toolPermissions),
        createdAt: ts,
      };
      db.insert(agents).values(row).run();
      return normalizeAgent(row)!;
    },

    update(id: string, input: UpdateAgentInput) {
      const existing = db
        .select()
        .from(agents)
        .where(eq(agents.id, id))
        .get();
      if (!existing) return null;
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.role !== undefined) updates.role = input.role;
      if (input.persona !== undefined) updates.persona = input.persona;
      if (input.runnerId !== undefined) updates.runnerId = input.runnerId;
      if (input.modelConfig !== undefined)
        updates.modelConfig = serializeJson(input.modelConfig);
      if (input.llmConfig !== undefined)
        updates.llmConfig = input.llmConfig
          ? JSON.stringify(input.llmConfig)
          : null;
      if (input.toolPermissions !== undefined)
        updates.toolPermissions = serializeJson(input.toolPermissions);
      db.update(agents).set(updates).where(eq(agents.id, id)).run();
      return normalizeAgent(
        db.select().from(agents).where(eq(agents.id, id)).get(),
      );
    },

    getEffectiveLLMSettings(agentId: string): LLMSettings | null {
      const agent = db.select().from(agents).where(eq(agents.id, agentId)).get();
      if (!agent) return null;
      if (agent.llmConfig) {
        return JSON.parse(agent.llmConfig) as LLMSettings;
      }
      return settingsSvc?.getLLMSettings() ?? null;
    },

    delete(id: string) {
      const existing = db
        .select()
        .from(agents)
        .where(eq(agents.id, id))
        .get();
      if (!existing) return false;
      db.delete(agents).where(eq(agents.id, id)).run();
      return true;
    },

    getSkills(agentId: string) {
      return db
        .select({ skill: skills })
        .from(agentSkills)
        .innerJoin(skills, eq(agentSkills.skillId, skills.id))
        .where(eq(agentSkills.agentId, agentId))
        .all()
        .map((r) => r.skill);
    },

    attachSkill(agentId: string, skillId: string) {
      db.insert(agentSkills).values({ agentId, skillId }).run();
    },

    detachSkill(agentId: string, skillId: string) {
      db.delete(agentSkills)
        .where(
          eq(agentSkills.agentId, agentId) &&
            eq(agentSkills.skillId, skillId),
        )
        .run();
    },
  };
}
