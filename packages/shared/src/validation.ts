import { z } from "zod";
import {
  CARD_STATUS_VALUES,
  CARD_PRIORITY_VALUES,
  RUN_STATUS_VALUES,
  RUN_EVENT_TYPE_VALUES,
  MESSAGE_AUTHOR_TYPE_VALUES,
  ARTIFACT_TYPE_VALUES,
  ACCEPTANCE_CRITERIA_STATUS_VALUES,
  SUBTASK_STATUS_VALUES,
} from "./constants.js";

// ── Board ──────────────────────────────────────────────────────────
export const worktreeModeSchema = z.enum(['none', 'auto', 'manual']);

export const createBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  projectDir: z.string().max(1000).nullable().optional(),
  worktreeMode: worktreeModeSchema.optional(),
  commandingAgentId: z.string().nullable().optional(),
});
export type CreateBoardInput = z.infer<typeof createBoardSchema>;

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  projectDir: z.string().max(1000).nullable().optional(),
  worktreeMode: worktreeModeSchema.optional(),
  commandingAgentId: z.string().nullable().optional(),
});
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;

// ── Column ─────────────────────────────────────────────────────────
export const createColumnSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1).max(255),
  position: z.number().int().min(0),
  agentId: z.string().nullable().optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
});
export type CreateColumnInput = z.infer<typeof createColumnSchema>;

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  position: z.number().int().min(0).optional(),
  agentId: z.string().nullable().optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
});
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;

// ── Card ───────────────────────────────────────────────────────────
export const createCardSchema = z.object({
  boardId: z.string().min(1),
  columnId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(CARD_STATUS_VALUES as [string, ...string[]]).optional(),
  priority: z.enum(CARD_PRIORITY_VALUES as [string, ...string[]]).optional(),
  position: z.number().int().min(0).optional(),
  assigneeAgentId: z.string().nullable().optional(),
});
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardSchema = z.object({
  columnId: z.string().min(1).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(CARD_STATUS_VALUES as [string, ...string[]]).optional(),
  priority: z.enum(CARD_PRIORITY_VALUES as [string, ...string[]]).optional(),
  position: z.number().int().min(0).optional(),
  assigneeAgentId: z.string().nullable().optional(),
});
export type UpdateCardInput = z.infer<typeof updateCardSchema>;

export const moveCardSchema = z.object({
  columnId: z.string().min(1),
  position: z.number().int().min(0),
});
export type MoveCardInput = z.infer<typeof moveCardSchema>;

// ── Subtask ────────────────────────────────────────────────────────
export const createSubtaskSchema = z.object({
  cardId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(SUBTASK_STATUS_VALUES as [string, ...string[]]).optional(),
  position: z.number().int().min(0).optional(),
});
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).nullable().optional(),
  completed: z.boolean().optional(),
  status: z.enum(SUBTASK_STATUS_VALUES as [string, ...string[]]).optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;

// ── AcceptanceCriterion ────────────────────────────────────────────
export const createAcceptanceCriterionSchema = z.object({
  cardId: z.string().min(1),
  description: z.string().min(1).max(2000),
  position: z.number().int().min(0).optional(),
});
export type CreateAcceptanceCriterionInput = z.infer<
  typeof createAcceptanceCriterionSchema
>;

export const updateAcceptanceCriterionSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  status: z
    .enum(ACCEPTANCE_CRITERIA_STATUS_VALUES as [string, ...string[]])
    .optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateAcceptanceCriterionInput = z.infer<
  typeof updateAcceptanceCriterionSchema
>;

// ── LLM Settings ──────────────────────────────────────────────────
export const llmSettingsSchema = z.object({
  provider: z.enum(["openai", "anthropic"]),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
});

// ── Agent ──────────────────────────────────────────────────────────
export const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.string().min(1).max(255),
  persona: z.string().max(100000).nullable().optional(),
  runnerId: z.string().nullable().optional(),
  modelConfig: z.record(z.unknown()).nullable().optional(),
  llmConfig: llmSettingsSchema.nullable().optional(),
  toolPermissions: z.record(z.unknown()).nullable().optional(),
});
export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.string().min(1).max(255).optional(),
  persona: z.string().max(100000).nullable().optional(),
  runnerId: z.string().nullable().optional(),
  modelConfig: z.record(z.unknown()).nullable().optional(),
  llmConfig: llmSettingsSchema.nullable().optional(),
  toolPermissions: z.record(z.unknown()).nullable().optional(),
});
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

// Agent catalog presets are reusable templates. Agent instances are created
// from these presets and can then be customized per board/project.
export const createAgentCatalogPresetSchema = z.object({
  id: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255),
  role: z.string().min(1).max(255),
  division: z.string().max(255).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  persona: z.string().max(100000).nullable().optional(),
  tags: z.array(z.string().min(1).max(100)).optional(),
  suggestedRunner: z.string().max(255).nullable().optional(),
  suggestedModelConfig: z.record(z.unknown()).nullable().optional(),
  defaultToolPermissions: z.record(z.unknown()).nullable().optional(),
  source: z.string().max(255).nullable().optional(),
  sourceRef: z.string().max(1000).nullable().optional(),
});
export type CreateAgentCatalogPresetInput = z.infer<
  typeof createAgentCatalogPresetSchema
>;

export const instantiateAgentPresetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  runnerId: z.string().nullable().optional(),
  modelConfig: z.record(z.unknown()).nullable().optional(),
  llmConfig: llmSettingsSchema.nullable().optional(),
  toolPermissions: z.record(z.unknown()).nullable().optional(),
});
export type InstantiateAgentPresetInput = z.infer<
  typeof instantiateAgentPresetSchema
>;

// ── Skill ──────────────────────────────────────────────────────────
export const createSkillSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  filePath: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});
export type CreateSkillInput = z.infer<typeof createSkillSchema>;

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  filePath: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;

// ── Run ────────────────────────────────────────────────────────────
export const createRunSchema = z.object({
  boardId: z.string().min(1),
  cardId: z.string().min(1),
  agentId: z.string().min(1),
  runnerId: z.string().nullable().optional(),
  prompt: z.string().max(50000).nullable().optional(),
});
export type CreateRunInput = z.infer<typeof createRunSchema>;

export const updateRunSchema = z.object({
  status: z.enum(RUN_STATUS_VALUES as [string, ...string[]]).optional(),
  exitCode: z.number().int().nullable().optional(),
});
export type UpdateRunInput = z.infer<typeof updateRunSchema>;

// ── RunEvent ───────────────────────────────────────────────────────
export const createRunEventSchema = z.object({
  runId: z.string().min(1),
  type: z.enum(RUN_EVENT_TYPE_VALUES as [string, ...string[]]),
  data: z.string(),
});
export type CreateRunEventInput = z.infer<typeof createRunEventSchema>;

// ── Message ────────────────────────────────────────────────────────
export const createMessageSchema = z.object({
  boardId: z.string().min(1),
  cardId: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  authorType: z.enum(MESSAGE_AUTHOR_TYPE_VALUES as [string, ...string[]]),
  authorId: z.string().min(1),
  content: z.string().min(1).max(50000),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

// ── Artifact ───────────────────────────────────────────────────────
export const createArtifactSchema = z.object({
  cardId: z.string().min(1),
  runId: z.string().nullable().optional(),
  type: z.enum(ARTIFACT_TYPE_VALUES as [string, ...string[]]),
  name: z.string().min(1).max(500),
  content: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});
export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;

// ── Lease ──────────────────────────────────────────────────────────
export const claimLeaseSchema = z.object({
  cardId: z.string().min(1),
  agentId: z.string().min(1),
  durationMs: z.number().int().min(1000).max(3600000).optional(),
});
export type ClaimLeaseInput = z.infer<typeof claimLeaseSchema>;

export const renewLeaseSchema = z.object({
  durationMs: z.number().int().min(1000).max(3600000).optional(),
});
export type RenewLeaseInput = z.infer<typeof renewLeaseSchema>;

// ── Secret ─────────────────────────────────────────────────────────
export const createSecretSchema = z.object({
  name: z.string().min(1).max(255),
  value: z.string().min(1),
});
export type CreateSecretInput = z.infer<typeof createSecretSchema>;

// ── Board Document ────────────────────────────────────────────────
export const createBoardDocumentSchema = z.object({
  boardId: z.string().min(1),
  section: z.string().min(1).max(255),
  title: z.string().min(1).max(500),
  content: z.string().max(100000).nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
});
export type CreateBoardDocumentInput = z.infer<typeof createBoardDocumentSchema>;

export const updateBoardDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(100000).nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateBoardDocumentInput = z.infer<typeof updateBoardDocumentSchema>;
