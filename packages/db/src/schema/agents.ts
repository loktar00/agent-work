import { sqliteTable, text, primaryKey, integer, index } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  persona: text("persona"),
  runnerId: text("runner_id"),
  modelConfig: text("model_config"),
  llmConfig: text("llm_config"),
  toolPermissions: text("tool_permissions"),
  createdAt: text("created_at").notNull(),
});

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  filePath: text("file_path"),
  source: text("source"),
});

export const agentSkills = sqliteTable(
  "agent_skills",
  {
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.agentId, table.skillId] })],
);

export const agentCatalogPresets = sqliteTable(
  "agent_catalog_presets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    division: text("division"),
    description: text("description"),
    persona: text("persona"),
    tags: text("tags"),
    suggestedRunner: text("suggested_runner"),
    suggestedModelConfig: text("suggested_model_config"),
    defaultToolPermissions: text("default_tool_permissions"),
    source: text("source"),
    sourceRef: text("source_ref"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("agent_catalog_presets_role_idx").on(table.role),
    index("agent_catalog_presets_division_idx").on(table.division),
  ],
);
