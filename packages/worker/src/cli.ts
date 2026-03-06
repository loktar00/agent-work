#!/usr/bin/env node
import { ServerAPI } from "./api.js";
import { executeRun } from "./runner.js";

const DEFAULT_POLL_INTERVAL = 5000;

function parseArgs(): {
  server: string;
  dir: string;
  workerId: string;
  boardId?: string;
  pollInterval: number;
} {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      opts[args[i].slice(2)] = args[++i];
    }
  }

  if (!opts.server) {
    console.error("Usage: awall-worker --server <url> --dir <project-dir> [--worker-id <id>] [--board-id <id>] [--poll-interval <ms>]");
    process.exit(1);
  }

  if (!opts.dir) {
    console.error("Error: --dir is required (local project directory)");
    process.exit(1);
  }

  return {
    server: opts.server.replace(/\/$/, ""),
    dir: opts.dir,
    workerId: opts["worker-id"] ?? `worker-${process.pid}`,
    boardId: opts["board-id"],
    pollInterval: Number(opts["poll-interval"]) || DEFAULT_POLL_INTERVAL,
  };
}

async function main() {
  const config = parseArgs();
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
      if (!claimed) return; // someone else got it

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
        } catch { /* ignore cleanup errors */ }
      } finally {
        activeRun = false;
      }
    } catch (err) {
      // Network errors during polling are expected when server is down
      console.error(`[awall-worker] Poll error:`, (err as Error).message);
    }
  };

  // Initial poll, then interval
  await poll();
  const interval = setInterval(poll, config.pollInterval);

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n[awall-worker] Shutting down...");
    clearInterval(interval);
    // If a run is active, let it finish naturally
    if (!activeRun) process.exit(0);
    // Otherwise wait for it to complete
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

main().catch((err) => {
  console.error("[awall-worker] Fatal:", err);
  process.exit(1);
});
