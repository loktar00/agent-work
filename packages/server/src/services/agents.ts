import { eq } from "drizzle-orm";
import { agents, agentSkills, skills } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type { CreateAgentInput, UpdateAgentInput } from "@agent-board/shared";
import { newId, now } from "../utils.js";

export function agentService(db: DB) {
  return {
    list() {
      return db.select().from(agents).all();
    },

    getById(id: string) {
      return db.select().from(agents).where(eq(agents.id, id)).get();
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
        modelConfig: input.modelConfig
          ? JSON.stringify(input.modelConfig)
          : null,
        toolPermissions: input.toolPermissions
          ? JSON.stringify(input.toolPermissions)
          : null,
        createdAt: ts,
      };
      db.insert(agents).values(row).run();
      return row;
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
        updates.modelConfig = input.modelConfig
          ? JSON.stringify(input.modelConfig)
          : null;
      if (input.toolPermissions !== undefined)
        updates.toolPermissions = input.toolPermissions
          ? JSON.stringify(input.toolPermissions)
          : null;
      db.update(agents).set(updates).where(eq(agents.id, id)).run();
      return db.select().from(agents).where(eq(agents.id, id)).get();
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
