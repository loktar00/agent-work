import type { EventEmitter } from "node:events";

export interface RunInput {
  runId: string;
  prompt: string;
  projectDir: string;
  agentConfig: {
    name: string;
    role: string;
    persona: string | null;
    modelConfig: Record<string, unknown> | null;
    toolPermissions: Record<string, unknown> | null;
    skills: Array<{ name: string; filePath: string | null }>;
  };
  context: {
    card: Record<string, unknown>;
    subtasks: unknown[];
    acceptanceCriteria: unknown[];
    recentMessages: unknown[];
    artifacts: unknown[];
  } | null;
}

export interface RunHandle {
  /** Wait for the run to complete */
  wait(): Promise<RunResult>;
  /** Cancel the run */
  cancel(): void;
  /** Event emitter for stdout/stderr/status events */
  events: EventEmitter;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface RunnerAdapter {
  readonly type: string;
  run(input: RunInput): RunHandle;
}
