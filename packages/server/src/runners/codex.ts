import { BaseRunnerAdapter } from "./base.js";
import type { RunInput } from "./types.js";

export class CodexAdapter extends BaseRunnerAdapter {
  readonly type = "codex";

  private command: string;
  private extraArgs: string[];

  constructor(opts?: { command?: string; args?: string[] }) {
    super();
    this.command = opts?.command ?? "codex";
    this.extraArgs = opts?.args ?? [];
  }

  protected buildCommand(input: RunInput) {
    const mc = input.agentConfig.modelConfig ?? {};
    const args = [...this.extraArgs];

    const model = mc.model as string | undefined;
    if (model) args.push("--model", model);

    const approval = mc.approval as string | undefined;
    if (approval) args.push("--approval-mode", approval);

    return {
      command: this.command,
      args,
      cwd: input.projectDir,
    };
  }

  protected buildPrompt(input: RunInput): string {
    return input.prompt;
  }
}
