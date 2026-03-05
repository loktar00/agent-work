import { eq } from "drizzle-orm";
import { runs as runsTable } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type { RunnerRegistry } from "./registry.js";
import type { RunInput, RunHandle } from "./types.js";
import { runService } from "../services/runs.js";
import { agentService } from "../services/agents.js";
import { skillService } from "../services/skills.js";
import { boardService } from "../services/boards.js";
import { contextBuilder } from "../services/context.js";
import { worktreeService } from "../services/worktree.js";
import { cardService } from "../services/cards.js";
import { now } from "../utils.js";
import type { EventEmitter } from "node:events";

interface QueueItem {
  runId: string;
}

export class RunQueue {
  private queue: QueueItem[] = [];
  private activeRuns = new Map<string, RunHandle>();
  private maxConcurrency: number;
  private processing = false;
  private db: DB;
  private registry: RunnerRegistry;
  private sseEmitter: EventEmitter;
  private projectDir: string;
  private boardApiUrl: string;

  constructor(opts: {
    db: DB;
    registry: RunnerRegistry;
    sseEmitter: EventEmitter;
    maxConcurrency?: number;
    projectDir?: string;
    boardApiUrl?: string;
  }) {
    this.db = opts.db;
    this.registry = opts.registry;
    this.sseEmitter = opts.sseEmitter;
    this.maxConcurrency = opts.maxConcurrency ?? 2;
    this.projectDir = opts.projectDir ?? process.cwd();
    this.boardApiUrl = opts.boardApiUrl ?? "http://localhost:3000";
  }

  enqueue(runId: string) {
    this.queue.push({ runId });
    this.process();
  }

  cancel(runId: string): boolean {
    // Check if in queue
    const idx = this.queue.findIndex((q) => q.runId === runId);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
      return true;
    }

    // Check if active
    const handle = this.activeRuns.get(runId);
    if (handle) {
      handle.cancel();
      return true;
    }

    return false;
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (
      this.queue.length > 0 &&
      this.activeRuns.size < this.maxConcurrency
    ) {
      const item = this.queue.shift()!;
      await this.execute(item);
    }

    this.processing = false;
  }

  private async execute(item: QueueItem) {
    const runs = runService(this.db);
    const agents = agentService(this.db);
    const boards = boardService(this.db);
    const cards = cardService(this.db);
    const skills = skillService(this.db);
    const ctx = contextBuilder(this.db);
    const wt = worktreeService();

    const run = runs.getById(item.runId);
    if (!run || run.status !== "queued") return;

    const agent = agents.getById(run.agentId);
    if (!agent) {
      runs.update(item.runId, { status: "failed" });
      return;
    }

    const agentSkills = agents.getSkills(run.agentId);
    const runnerId = run.runnerId ?? agent.runnerId ?? "claude-code";
    const adapter = this.registry.get(runnerId);
    if (!adapter) {
      runs.update(item.runId, { status: "failed" });
      runs.addEvent(item.runId, "error", `Runner "${runnerId}" not found`);
      return;
    }

    // Resolve project directory from board settings
    const board = boards.getById(run.boardId);
    let runProjectDir = board?.projectDir ?? this.projectDir;
    let worktreeDir: string | null = null;

    // Handle worktree mode
    if (board?.worktreeMode === "auto" && board.projectDir && wt.isGitRepo(board.projectDir)) {
      try {
        const card = cards.getById(run.cardId);
        const branchName = wt.branchNameFromCard(run.cardId, card?.title ?? "task");
        worktreeDir = wt.acquire(board.projectDir, branchName);
        runProjectDir = worktreeDir;
        runs.addEvent(item.runId, "stdout", `Using worktree: ${worktreeDir} (branch: ${branchName})`);
      } catch (err) {
        runs.addEvent(item.runId, "stderr", `Worktree creation failed, using base dir: ${err}`);
      }
    }

    // Mark as running
    runs.update(item.runId, { status: "running", startedAt: now() });
    this.sseEmitter.emit(`board:${run.boardId}`, {
      event: "run:started",
      data: { runId: item.runId },
    });

    const cardContext = ctx.buildCardContext(run.cardId);

    const input: RunInput = {
      runId: item.runId,
      prompt: run.prompt ?? "Complete the task described in the card.",
      projectDir: runProjectDir,
      boardApiUrl: this.boardApiUrl,
      boardId: run.boardId,
      cardId: run.cardId,
      agentConfig: {
        name: agent.name,
        role: agent.role,
        persona: agent.persona,
        modelConfig: agent.modelConfig
          ? JSON.parse(agent.modelConfig)
          : null,
        llmConfig: agent.llmConfig
          ? JSON.parse(agent.llmConfig)
          : null,
        toolPermissions: agent.toolPermissions
          ? JSON.parse(agent.toolPermissions)
          : null,
        skills: agentSkills.map((s) => ({
          name: s.name,
          filePath: s.filePath,
        })),
      },
      context: cardContext
        ? {
            card: cardContext.card as unknown as Record<string, unknown>,
            subtasks: cardContext.subtasks,
            recentMessages: cardContext.recentMessages,
            artifacts: cardContext.artifacts,
          }
        : null,
    };

    const handle = adapter.run(input);
    this.activeRuns.set(item.runId, handle);

    handle.events.on("stdout", (data: string) => {
      runs.addEvent(item.runId, "stdout", data);
      this.sseEmitter.emit(`run:${item.runId}`, {
        event: "run_event:created",
        data: { runId: item.runId, type: "stdout", data },
      });
    });

    handle.events.on("stderr", (data: string) => {
      runs.addEvent(item.runId, "stderr", data);
      this.sseEmitter.emit(`run:${item.runId}`, {
        event: "run_event:created",
        data: { runId: item.runId, type: "stderr", data },
      });
    });

    handle.events.on("error", (data: string) => {
      runs.addEvent(item.runId, "error", data);
    });

    // Wait for completion in background
    handle.wait().then((result) => {
      this.activeRuns.delete(item.runId);
      const status = result.exitCode === 0 ? "completed" : "failed";
      runs.update(item.runId, {
        status,
        exitCode: result.exitCode,
        finishedAt: now(),
      });
      this.sseEmitter.emit(`board:${run.boardId}`, {
        event: "run:finished",
        data: { runId: item.runId, status, exitCode: result.exitCode },
      });
      // Try to process next in queue
      this.process();
    });
  }

  /** On startup, mark any orphaned "running" runs as failed */
  recoverOrphanedRuns() {
    const runs = runService(this.db);

    const orphaned = this.db
      .select()
      .from(runsTable)
      .where(eq(runsTable.status, "running"))
      .all();

    for (const run of orphaned) {
      runs.update(run.id, { status: "failed", finishedAt: now() });
      runs.addEvent(
        run.id,
        "error",
        "Run was orphaned during server restart and marked as failed.",
      );
    }

    // Re-enqueue any queued runs that weren't being processed
    const queued = this.db
      .select()
      .from(runsTable)
      .where(eq(runsTable.status, "queued"))
      .all();

    for (const run of queued) {
      this.enqueue(run.id);
    }
  }
}
