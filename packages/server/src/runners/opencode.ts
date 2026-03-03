import { BaseRunnerAdapter } from "./base.js";
import type { RunInput } from "./types.js";

export class OpenCodeAdapter extends BaseRunnerAdapter {
  readonly type = "opencode";

  private command: string;
  private extraArgs: string[];

  constructor(opts?: { command?: string; args?: string[] }) {
    super();
    this.command = opts?.command ?? "opencode";
    this.extraArgs = opts?.args ?? [];
  }

  protected buildCommand(input: RunInput) {
    return {
      command: this.command,
      args: [...this.extraArgs],
      cwd: input.projectDir,
    };
  }

  protected buildPrompt(input: RunInput): string {
    return input.prompt;
  }
}
