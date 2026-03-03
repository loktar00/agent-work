import type { RunnerAdapter } from "./types.js";
import type { RunnerConfig } from "../config.js";
import { ClaudeCodeAdapter } from "./claude-code.js";
import { DroidAdapter } from "./droid.js";
import { CodexAdapter } from "./codex.js";
import { OpenCodeAdapter } from "./opencode.js";

const adapterFactories: Record<
  string,
  (config: RunnerConfig) => RunnerAdapter
> = {
  "claude-code": (c) => new ClaudeCodeAdapter({ command: c.command, args: c.args }),
  droid: (c) => new DroidAdapter({ command: c.command, args: c.args }),
  codex: (c) => new CodexAdapter({ command: c.command, args: c.args }),
  opencode: (c) => new OpenCodeAdapter({ command: c.command, args: c.args }),
};

export class RunnerRegistry {
  private adapters = new Map<string, RunnerAdapter>();

  constructor(runnersConfig: Record<string, RunnerConfig>) {
    for (const [name, config] of Object.entries(runnersConfig)) {
      const factory = adapterFactories[config.type];
      if (factory) {
        this.adapters.set(name, factory(config));
      }
    }

    // Always register default adapters if not configured
    if (!this.adapters.has("claude-code")) {
      this.adapters.set("claude-code", new ClaudeCodeAdapter());
    }
  }

  get(name: string): RunnerAdapter | undefined {
    return this.adapters.get(name);
  }

  list(): Array<{ name: string; type: string }> {
    return Array.from(this.adapters.entries()).map(([name, adapter]) => ({
      name,
      type: adapter.type,
    }));
  }
}
