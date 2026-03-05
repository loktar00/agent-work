import { EventEmitter } from "node:events";
import type { RunnerAdapter, RunInput, RunHandle, RunResult } from "./types.js";
import { callLLM } from "../llm/provider.js";
import type { ChatMessage } from "../llm/provider.js";
import { boardTools } from "../llm/tools.js";
import { executeTool, type ExecutorServices } from "../llm/executor.js";
import type { LLMSettings } from "@agent-board/shared";
import type { settingsService } from "../services/settings.js";

export class LLMRunnerAdapter implements RunnerAdapter {
  readonly type = "llm";
  private services: ExecutorServices;
  private settingsSvc: ReturnType<typeof settingsService>;

  constructor(opts: {
    services: ExecutorServices;
    settingsSvc: ReturnType<typeof settingsService>;
  }) {
    this.services = opts.services;
    this.settingsSvc = opts.settingsSvc;
  }

  run(input: RunInput): RunHandle {
    const events = new EventEmitter();

    const promise = this.executeWithLLM(input, events);

    let cancelled = false;
    return {
      events,
      wait: () => promise,
      cancel: () => {
        cancelled = true;
        events.emit("status", "cancelled");
      },
    };
  }

  private async executeWithLLM(
    input: RunInput,
    events: EventEmitter,
  ): Promise<RunResult> {
    try {
      // Resolve LLM settings: agent-level > global
      const llmSettings: LLMSettings | null =
        input.agentConfig.llmConfig ?? this.settingsSvc.getLLMSettings();

      if (!llmSettings) {
        const err = "No LLM settings configured for this agent or globally.";
        events.emit("stderr", err);
        return { exitCode: 1, stdout: "", stderr: err };
      }

      // Build system prompt from agent persona
      const systemPrompt = [
        `You are ${input.agentConfig.name}, a ${input.agentConfig.role}.`,
        input.agentConfig.persona ?? "",
        `\nYou have access to board management tools. Use them to take actions on the board.`,
        `Board ID: ${input.boardId}`,
      ]
        .filter(Boolean)
        .join("\n");

      const msgs: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.prompt },
      ];

      let stdout = "";

      // Tool-use loop (max 10 iterations)
      for (let i = 0; i < 10; i++) {
        const response = await callLLM(llmSettings, msgs, boardTools);

        if (response.content) {
          stdout += response.content + "\n";
          events.emit("stdout", response.content);
        }

        if (response.toolCalls.length === 0) break;

        // Add assistant message with tool calls
        msgs.push({
          role: "assistant",
          content: response.content ?? "",
          tool_calls: response.toolCalls,
        });

        // Execute each tool
        for (const tc of response.toolCalls) {
          const toolInput = JSON.parse(tc.arguments);
          // Inject boardId if not present
          if (!toolInput.boardId) toolInput.boardId = input.boardId;

          const result = executeTool(tc.name, toolInput, this.services);
          const resultStr = JSON.stringify(result);

          events.emit(
            "stdout",
            `[Tool: ${tc.name}] ${resultStr.slice(0, 200)}`,
          );

          msgs.push({
            role: "tool",
            content: resultStr,
            tool_call_id: tc.id,
          });
        }
      }

      events.emit("status", "completed");
      return { exitCode: 0, stdout, stderr: "" };
    } catch (err: any) {
      const errMsg = err.message ?? "LLM runner error";
      events.emit("stderr", errMsg);
      events.emit("error", errMsg);
      return { exitCode: 1, stdout: "", stderr: errMsg };
    }
  }
}
