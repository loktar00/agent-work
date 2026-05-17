#!/usr/bin/env node
import { ServerAPI } from "./api.js";
import { executeRun } from "./runner.js";

const DEFAULT_POLL_INTERVAL = 5000;

function parseOptions(args: string[]) {
  const opts: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        opts[key] = next;
        i++;
      } else {
        opts[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }

  return { opts, positional };
}

function required(opts: Record<string, string>, key: string) {
  const value = opts[key];
  if (!value) {
    throw new Error(`--${key} is required`);
  }
  return value;
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function runWorker(args: string[]) {
  const { opts } = parseOptions(args);

  if (!opts.server) {
    console.error("Usage: awall worker --server <url> --dir <project-dir> [--worker-id <id>] [--board-id <id>] [--poll-interval <ms>]");
    process.exit(1);
  }

  if (!opts.dir) {
    console.error("Error: --dir is required (local project directory)");
    process.exit(1);
  }

  const config = {
    server: opts.server.replace(/\/$/, ""),
    dir: opts.dir,
    workerId: opts["worker-id"] ?? `worker-${process.pid}`,
    boardId: opts["board-id"],
    pollInterval: Number(opts["poll-interval"]) || DEFAULT_POLL_INTERVAL,
  };

  const api = new ServerAPI(config.server, config.workerId);

  console.log(`[awall-worker] Starting worker ${config.workerId}`);
  console.log(`[awall-worker] Server: ${config.server}`);
  console.log(`[awall-worker] Project dir: ${config.dir}`);
  if (config.boardId) console.log(`[awall-worker] Board filter: ${config.boardId}`);
  console.log(`[awall-worker] Poll interval: ${config.pollInterval}ms`);

  let activeRun = false;

  const poll = async () => {
    if (activeRun) return;

    try {
      const queued = await api.getQueuedRuns(config.boardId);
      if (queued.length === 0) return;

      const run = queued[0];
      const claimed = await api.claimRun(run.id);
      if (!claimed) return;

      activeRun = true;
      console.log(`[awall-worker] Claimed run ${run.id} for card ${run.cardId}`);

      try {
        const result = await executeRun(claimed, config.dir, api);
        await api.completeRun(run.id, result.exitCode);
        console.log(`[awall-worker] Run ${run.id} completed with exit code ${result.exitCode}`);
      } catch (err) {
        console.error(`[awall-worker] Run ${run.id} failed:`, err);
        try {
          await api.postEvent(run.id, "error", String(err));
          await api.completeRun(run.id, 1);
        } catch {
          // ignore cleanup errors
        }
      } finally {
        activeRun = false;
      }
    } catch (err) {
      console.error(`[awall-worker] Poll error:`, (err as Error).message);
    }
  };

  await poll();
  const interval = setInterval(poll, config.pollInterval);

  const shutdown = () => {
    console.log("\n[awall-worker] Shutting down...");
    clearInterval(interval);
    if (!activeRun) process.exit(0);
    const check = setInterval(() => {
      if (!activeRun) {
        clearInterval(check);
        process.exit(0);
      }
    }, 1000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function runCommand(command: string, args: string[]) {
  const { opts, positional } = parseOptions(args);
  const server = required(opts, "server").replace(/\/$/, "");
  const workerId = opts["worker-id"] ?? `awall-cli-${process.pid}`;
  const api = new ServerAPI(server, workerId);

  switch (command) {
    case "context": {
      const runId = required(opts, "run");
      printJson(await api.getRunContext(runId));
      return;
    }

    case "tools": {
      const boardId = required(opts, "board");
      printJson(await api.getTools(boardId, opts.agent));
      return;
    }

    case "call": {
      const toolName = positional[0];
      if (!toolName) throw new Error("Tool name is required: awall call <toolName>");
      const boardId = required(opts, "board");
      const input = opts.input ? JSON.parse(opts.input) : {};
      printJson(
        await api.callTool(boardId, toolName, input, {
          agentId: opts.agent,
          runId: opts.run,
          actorId: opts["actor-id"],
        }),
      );
      return;
    }

    case "message": {
      const boardId = required(opts, "board");
      const cardId = required(opts, "card");
      const text = required(opts, "text");
      printJson(
        await api.callTool(
          boardId,
          "send_message",
          {
            boardId,
            cardId,
            content: text,
            authorType: "agent",
            authorId: opts.agent ?? workerId,
          },
          { agentId: opts.agent, runId: opts.run, actorId: opts.agent ?? workerId },
        ),
      );
      return;
    }

    case "heartbeat": {
      const runId = required(opts, "run");
      printJson(await api.heartbeat(runId));
      return;
    }

    default:
      throw new Error(`Unknown awall command: ${command}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  if (!command || command === "worker" || command.startsWith("--")) {
    await runWorker(command === "worker" ? rest : args);
    return;
  }

  await runCommand(command, rest);
}

main().catch((err) => {
  console.error("[awall] Fatal:", err.message ?? err);
  process.exit(1);
});
