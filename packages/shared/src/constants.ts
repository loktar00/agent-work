export const CardStatus = {
  backlog: "backlog",
  todo: "todo",
  in_progress: "in_progress",
  in_review: "in_review",
  done: "done",
  archived: "archived",
} as const;
export type CardStatus = (typeof CardStatus)[keyof typeof CardStatus];

export const CardPriority = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
} as const;
export type CardPriority = (typeof CardPriority)[keyof typeof CardPriority];

export const RunStatus = {
  queued: "queued",
  running: "running",
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const RunEventType = {
  stdout: "stdout",
  stderr: "stderr",
  status: "status",
  error: "error",
} as const;
export type RunEventType = (typeof RunEventType)[keyof typeof RunEventType];

export const MessageAuthorType = {
  human: "human",
  agent: "agent",
} as const;
export type MessageAuthorType =
  (typeof MessageAuthorType)[keyof typeof MessageAuthorType];

export const ArtifactType = {
  log: "log",
  file: "file",
  url: "url",
  test_result: "test_result",
  diff: "diff",
} as const;
export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

export const AcceptanceCriteriaStatus = {
  pending: "pending",
  pass: "pass",
  fail: "fail",
} as const;
export type AcceptanceCriteriaStatus =
  (typeof AcceptanceCriteriaStatus)[keyof typeof AcceptanceCriteriaStatus];

export const SubtaskStatus = {
  pending: "pending",
  pass: "pass",
  fail: "fail",
} as const;
export type SubtaskStatus =
  (typeof SubtaskStatus)[keyof typeof SubtaskStatus];

export const AuditAction = {
  create: "create",
  update: "update",
  delete: "delete",
  move: "move",
  claim: "claim",
  release: "release",
  approve: "approve",
  reject: "reject",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const CARD_STATUS_VALUES = Object.values(CardStatus);
export const CARD_PRIORITY_VALUES = Object.values(CardPriority);
export const RUN_STATUS_VALUES = Object.values(RunStatus);
export const RUN_EVENT_TYPE_VALUES = Object.values(RunEventType);
export const MESSAGE_AUTHOR_TYPE_VALUES = Object.values(MessageAuthorType);
export const ARTIFACT_TYPE_VALUES = Object.values(ArtifactType);
export const ACCEPTANCE_CRITERIA_STATUS_VALUES = Object.values(
  AcceptanceCriteriaStatus,
);
export const SUBTASK_STATUS_VALUES = Object.values(SubtaskStatus);
export const AUDIT_ACTION_VALUES = Object.values(AuditAction);
