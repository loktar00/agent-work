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
    const mc = input.agentConfig.modelConfig ?? {};
    const args = [
      "--print",
      "--output-format",
      "text",
      ...this.extraArgs,
    ];

    // Use model from LLM config or model config
    const model = input.agentConfig.llmConfig?.model
      ?? (mc.model as string | undefined);
    if (model) {
      args.push("--model", model);
    }

    // Max turns
    const maxTurns = mc.maxTurns as number | undefined;
    if (maxTurns) {
      args.push("--max-turns", String(maxTurns));
    }

    // Allowed tools
    const allowedTools = mc.allowedTools as string[] | undefined;
    if (allowedTools?.length) {
      args.push("--allowedTools", allowedTools.join(","));
    }

    const env: Record<string, string> = {};

    // Set API key from LLM config
    if (input.agentConfig.llmConfig) {
      const lc = input.agentConfig.llmConfig;
      if (lc.provider === "anthropic" && lc.apiKey) {
        env.ANTHROPIC_API_KEY = lc.apiKey;
      } else if (lc.provider === "openai" && lc.apiKey) {
        env.OPENAI_API_KEY = lc.apiKey;
      }
    }

    // Board callback env vars
    env.AWALL_API_URL = input.boardApiUrl;
    env.AWALL_BOARD_ID = input.boardId;
    env.AWALL_CARD_ID = input.cardId;

    return {
      command: this.command,
      args,
      env,
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

    if (input.context?.recentMessages?.length) {
      parts.push(
        `## Recent Messages\n${JSON.stringify(input.context.recentMessages, null, 2)}\n`,
      );
    }

    // Board callback API instructions
    const apiUrl = input.boardApiUrl;
    const boardId = input.boardId;
    parts.push(`## Board API
You can report progress back to the board:
- Complete subtask: POST ${apiUrl}/api/boards/${boardId}/tools/update_subtask {"input":{"cardId":"...","subtaskId":"...","completed":true}}
- Post message: POST ${apiUrl}/api/boards/${boardId}/tools/send_message {"input":{"boardId":"${boardId}","cardId":"...","content":"..."}}
- Move card when done: POST ${apiUrl}/api/boards/${boardId}/tools/move_card {"input":{"cardId":"...","columnId":"..."}}
`);

    parts.push(`## Task\n${input.prompt}\n`);

    return parts.join("\n");
  }
}
