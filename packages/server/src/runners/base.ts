import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import type { RunnerAdapter, RunInput, RunHandle, RunResult } from "./types.js";

export abstract class BaseRunnerAdapter implements RunnerAdapter {
  abstract readonly type: string;

  protected abstract buildCommand(input: RunInput): {
    command: string;
    args: string[];
    env?: Record<string, string>;
    cwd?: string;
  };

  protected abstract buildPrompt(input: RunInput): string;

  run(input: RunInput): RunHandle {
    const events = new EventEmitter();
    const { command, args, env, cwd } = this.buildCommand(input);

    let proc: ChildProcess | null = null;
    let cancelled = false;
    let stdoutBuf = "";
    let stderrBuf = "";

    const promise = new Promise<RunResult>((resolve) => {
      proc = spawn(command, args, {
        cwd: cwd ?? input.projectDir,
        env: { ...process.env, ...env },
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      });

      const promptText = this.buildPrompt(input);
      if (proc.stdin) {
        proc.stdin.write(promptText);
        proc.stdin.end();
      }

      proc.stdout?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        stdoutBuf += text;
        events.emit("stdout", text);
      });

      proc.stderr?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        stderrBuf += text;
        events.emit("stderr", text);
      });

      proc.on("close", (code) => {
        events.emit("status", cancelled ? "cancelled" : "completed");
        resolve({
          exitCode: code ?? (cancelled ? 130 : 1),
          stdout: stdoutBuf,
          stderr: stderrBuf,
        });
      });

      proc.on("error", (err) => {
        events.emit("error", err.message);
        resolve({ exitCode: 1, stdout: stdoutBuf, stderr: err.message });
      });
    });

    return {
      events,
      wait: () => promise,
      cancel: () => {
        cancelled = true;
        proc?.kill("SIGTERM");
        setTimeout(() => proc?.kill("SIGKILL"), 5000);
      },
    };
  }
}
