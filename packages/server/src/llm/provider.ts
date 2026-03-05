import type { LLMSettings } from "@agent-board/shared";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: object;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ChatResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
}

export async function callLLM(
  settings: LLMSettings,
  messages: ChatMessage[],
  tools?: ToolDef[],
): Promise<ChatResponse> {
  if (settings.provider === "anthropic") {
    return callAnthropic(settings, messages, tools);
  }
  return callOpenAI(settings, messages, tools);
}

// ── OpenAI-compatible provider ──────────────────────────────────────

async function callOpenAI(
  settings: LLMSettings,
  messages: ChatMessage[],
  tools?: ToolDef[],
): Promise<ChatResponse> {
  const url = `${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const body: Record<string, unknown> = {
    model: settings.model,
    messages: messages.map((m) => {
      const msg: Record<string, unknown> = { role: m.role, content: m.content };
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
      if (m.tool_calls) msg.tool_calls = m.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: tc.arguments },
      }));
      return msg;
    }),
    max_tokens: 4096,
  };

  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.apiKey) {
    headers["Authorization"] = `Bearer ${settings.apiKey}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = await res.json() as any;
  const choice = data.choices?.[0];
  if (!choice) throw new Error("No choices in response");

  const msg = choice.message;
  const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));

  return {
    content: msg.content ?? null,
    toolCalls,
    finishReason: choice.finish_reason ?? "stop",
  };
}

// ── Anthropic provider ──────────────────────────────────────────────

async function callAnthropic(
  settings: LLMSettings,
  messages: ChatMessage[],
  tools?: ToolDef[],
): Promise<ChatResponse> {
  // Separate system message from conversation
  let systemPrompt: string | undefined;
  const apiMessages: Array<{ role: string; content: unknown }> = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemPrompt = m.content;
      continue;
    }

    if (m.role === "tool") {
      // Anthropic expects tool results as user messages with tool_result blocks
      apiMessages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.tool_call_id,
            content: m.content,
          },
        ],
      });
      continue;
    }

    if (m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
      // Convert tool calls to Anthropic format
      const blocks: unknown[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const tc of m.tool_calls) {
        blocks.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: JSON.parse(tc.arguments),
        });
      }
      apiMessages.push({ role: "assistant", content: blocks });
      continue;
    }

    apiMessages.push({ role: m.role, content: m.content });
  }

  const body: Record<string, unknown> = {
    model: settings.model,
    max_tokens: 4096,
    messages: apiMessages,
  };
  if (systemPrompt) body.system = systemPrompt;

  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json() as any;

  const toolCalls: ToolCall[] = [];
  let content: string | null = null;
  const textParts: string[] = [];

  for (const block of data.content ?? []) {
    if (block.type === "text") {
      textParts.push(block.text);
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: JSON.stringify(block.input),
      });
    }
  }

  if (textParts.length > 0) content = textParts.join("\n");

  return {
    content,
    toolCalls,
    finishReason: data.stop_reason ?? "end_turn",
  };
}
