import type {
  CardStatus,
  CardPriority,
  RunStatus,
  RunEventType,
  MessageAuthorType,
  ArtifactType,
  AcceptanceCriteriaStatus,
  SubtaskStatus,
  AuditAction,
} from "../constants.js";

export type WorktreeMode = 'none' | 'auto' | 'manual';

export interface Board {
  id: string;
  name: string;
  description: string | null;
  projectDir: string | null;
  worktreeMode: WorktreeMode;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  position: number;
  agentId: string | null;
  wipLimit: number | null;
}

export interface Card {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string | null;
  status: CardStatus;
  priority: CardPriority;
  position: number;
  assigneeAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  cardId: string;
  title: string;
  description: string | null;
  completed: boolean;
  status: SubtaskStatus;
  position: number;
}

export interface AcceptanceCriterion {
  id: string;
  cardId: string;
  description: string;
  status: AcceptanceCriteriaStatus;
  position: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  persona: string | null;
  runnerId: string | null;
  modelConfig: Record<string, unknown> | null;
  llmConfig: LLMSettings | null;
  toolPermissions: Record<string, unknown> | null;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  filePath: string | null;
  source: string | null;
}

export interface Run {
  id: string;
  boardId: string;
  cardId: string;
  agentId: string;
  runnerId: string | null;
  status: RunStatus;
  prompt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
}

export interface RunEvent {
  id: string;
  runId: string;
  type: RunEventType;
  data: string;
  timestamp: string;
}

export interface Message {
  id: string;
  boardId: string;
  cardId: string | null;
  runId: string | null;
  authorType: MessageAuthorType;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Artifact {
  id: string;
  cardId: string;
  runId: string | null;
  type: ArtifactType;
  name: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  boardId: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  actorType: string;
  actorId: string;
  diff: Record<string, unknown> | null;
  createdAt: string;
}

export interface Secret {
  id: string;
  name: string;
  encryptedValue: string;
  iv: string;
  createdAt: string;
}

export interface Lease {
  id: string;
  cardId: string;
  agentId: string;
  expiresAt: string;
  renewedAt: string | null;
  createdAt: string;
}

export interface LLMSettings {
  provider: "openai" | "anthropic";
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface BoardDocument {
  id: string;
  boardId: string;
  section: string;
  title: string;
  content: string | null;
  updatedBy: string | null;
  updatedAt: string;
  position: number;
}
