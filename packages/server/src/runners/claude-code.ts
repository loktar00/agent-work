import { BaseRunnerAdapter } from "./base.js";
import type { RunInput } from "./types.js";

export class ClaudeCodeAdapter extends BaseRunnerAdapter {
  readonly type = "claude-code";

  private command: string;
  private extraArgs: string[];

  constructor(opts?: { command?: string; args?: string[] }) {
    super();
    this.command = opts?.command ?? "claude";
    this.extraArgs = opts?.args ?? [];
  }

  protected buildCommand(input: RunInput) {
    const args = [
      "--print",
      "--output-format",
      "text",
      ...this.extraArgs,
    ];

    return {
      command: this.command,
      args,
      cwd: input.projectDir,
    };
  }

  protected buildPrompt(input: RunInput): string {
    const parts: string[] = [];

    if (input.agentConfig.persona) {
      parts.push(`## Agent Persona\n${input.agentConfig.persona}\n`);
    }

    if (input.context?.card) {
      parts.push(`## Card\n${JSON.stringify(input.context.card, null, 2)}\n`);
    }

    if (input.context?.subtasks?.length) {
      parts.push(
        `## Subtasks\n${JSON.stringify(input.context.subtasks, null, 2)}\n`,
      );
    }

    if (input.context?.acceptanceCriteria?.length) {
      parts.push(
        `## Acceptance Criteria\n${JSON.stringify(input.context.acceptanceCriteria, null, 2)}\n`,
      );
    }

    if (input.context?.recentMessages?.length) {
      parts.push(
        `## Recent Messages\n${JSON.stringify(input.context.recentMessages, null, 2)}\n`,
      );
    }

    parts.push(`## Task\n${input.prompt}\n`);

    return parts.join("\n");
  }
}
