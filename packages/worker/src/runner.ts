import { spawn } from "node:child_process";
import type { ClaimedRun, ServerAPI } from "./api.js";
import { acquireWorktree, branchNameFromCard, isGitRepo, releaseWorktree } from "./worktree.js";

export interface RunnerResult {
  exitCode: number;
}

/** Execute a run locally using the appropriate CLI tool */
export async function executeRun(
  run: ClaimedRun,
  projectDir: string,
  serverApi: ServerAPI,
): Promise<RunnerResult> {
  const runnerId = run.agentConfig?.runnerId ?? run.runnerId ?? "claude-code";
  const mc = run.agentConfig?.modelConfig ?? {};
  const lc = run.agentConfig?.llmConfig;

  // Resolve working directory (worktree support)
  let workDir = projectDir;
  let worktreeDir: string | null = null;
  const worktreeMode = run.board?.worktreeMode ?? "none";

  if (worktreeMode === "auto" && isGitRepo(projectDir)) {
    try {
      const cardTitle = run.card?.title ?? "task";
      const branch = branchNameFromCard(run.cardId, cardTitle);
      worktreeDir = acquireWorktree(projectDir, branch);
      workDir = worktreeDir;
      await serverApi.postEvent(run.id, "stdout", `[worker] Using worktree: ${worktreeDir} (branch: ${branch})\n`);
    } catch (err) {
      await serverApi.postEvent(run.id, "stderr", `[worker] Worktree creation failed, using base dir: ${err}\n`);
    }
  }

  // Build command based on runner type
  const { command, args, env } = buildCommand(runnerId, mc, lc, workDir, run);
  const prompt = buildPrompt(run, serverApi);

  await serverApi.postEvent(run.id, "stdout", `[worker] Running: ${command} ${args.join(" ")}\n[worker] CWD: ${workDir}\n`);

  try {
    const result = await spawnRunner(command, args, env, workDir, prompt, run.id, serverApi);
    return result;
  } finally {
    // Clean up worktree if we created one
    if (worktreeDir && worktreeMode === "auto") {
      try {
        releaseWorktree(projectDir, worktreeDir);
      } catch { /* ignore cleanup errors */ }
    }
  }
}

function buildCommand(
  runnerId: string,
  mc: Record<string, unknown>,
  lc: { provider: string; baseUrl: string; apiKey: string; model: string } | null | undefined,
  workDir: string,
  run: ClaimedRun,
): { command: string; args: string[]; env: Record<string, string> } {
  const env: Record<string, string> = {};

  switch (runnerId) {
    case "claude-code": {
      const args = ["--print", "--output-format", "text"];
      const model = lc?.model ?? (mc.model as string | undefined);
      if (model) args.push("--model", model);
      const maxTurns = mc.maxTurns as number | undefined;
      if (maxTurns) args.push("--max-turns", String(maxTurns));
      const allowedTools = mc.allowedTools as string[] | undefined;
      if (allowedTools?.length) args.push("--allowedTools", allowedTools.join(","));
      if (lc?.provider === "anthropic" && lc.apiKey) env.ANTHROPIC_API_KEY = lc.apiKey;
      else if (lc?.provider === "openai" && lc.apiKey) env.OPENAI_API_KEY = lc.apiKey;
      return { command: "claude", args, env };
    }
    case "codex": {
      const args: string[] = [];
      const model = mc.model as string | undefined;
      if (model) args.push("--model", model);
      const approval = mc.approval as string | undefined;
      if (approval) args.push("--approval-mode", approval);
      return { command: "codex", args, env };
    }
    case "aider": {
      const args: string[] = ["--yes"];
      const model = mc.model as string | undefined;
      if (model) args.push("--model", model);
      return { command: "aider", args, env };
    }
    default:
      return { command: runnerId, args: [], env };
  }
}

function buildPrompt(run: ClaimedRun, serverApi: ServerAPI): string {
  const parts: string[] = [];

  if (run.agentConfig?.persona) {
    parts.push(`## Agent Persona\n${run.agentConfig.persona}\n`);
  }

  if (run.context?.card) {
    parts.push(`## Card\n${JSON.stringify(run.context.card, null, 2)}\n`);
  }

  if (run.context?.subtasks?.length) {
    parts.push(`## Subtasks\n${JSON.stringify(run.context.subtasks, null, 2)}\n`);
  }

  if (run.context?.recentMessages?.length) {
    parts.push(`## Recent Messages\n${JSON.stringify(run.context.recentMessages, null, 2)}\n`);
  }

  // Board callback API instructions
  const baseUrl = (serverApi as any).baseUrl as string;
  parts.push(`## Board API
You can report progress back to the board:
- Post message: POST ${baseUrl}/api/messages {"boardId":"${run.boardId}","cardId":"${run.cardId}","authorType":"agent","authorId":"worker","content":"..."}
- Complete subtask: POST ${baseUrl}/api/boards/${run.boardId}/tools/update_subtask {"input":{"cardId":"${run.cardId}","subtaskId":"...","completed":true}}
- Move card: POST ${baseUrl}/api/boards/${run.boardId}/tools/move_card {"input":{"cardId":"${run.cardId}","columnId":"..."}}
`);

  parts.push(`## Task\n${run.prompt ?? "Complete the task described in the card."}\n`);

  return parts.join("\n");
}

function spawnRunner(
  command: string,
  args: string[],
  env: Record<string, string>,
  cwd: string,
  prompt: string,
  runId: string,
  serverApi: ServerAPI,
): Promise<RunnerResult> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });

    // Pipe prompt to stdin
    if (proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

    // Stream stdout/stderr to server
    proc.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      serverApi.postEvent(runId, "stdout", text).catch(() => {});
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      serverApi.postEvent(runId, "stderr", text).catch(() => {});
    });

    proc.on("close", (code: number | null) => {
      resolve({ exitCode: code ?? 1 });
    });

    proc.on("error", (err: Error) => {
      serverApi.postEvent(runId, "error", err.message).catch(() => {});
      resolve({ exitCode: 1 });
    });
  });
}
