import type { FastifyPluginAsync } from "fastify";
import { llmSettingsSchema } from "@agent-board/shared";
import type { LLMSettings } from "@agent-board/shared";
import { callLLM } from "../llm/provider.js";

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/settings/llm
  fastify.get("/settings/llm", async () => {
    const settings = fastify.settingsService.getLLMSettings();
    if (!settings) return { configured: false };
    return {
      configured: true,
      provider: settings.provider,
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey.length > 4
        ? "•".repeat(settings.apiKey.length - 4) + settings.apiKey.slice(-4)
        : "••••",
      model: settings.model,
    };
  });

  // PUT /api/settings/llm
  fastify.put<{ Body: LLMSettings }>("/settings/llm", async (req, reply) => {
    const parsed = llmSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }
    fastify.settingsService.setLLMSettings(parsed.data);
    return { ok: true };
  });

  // POST /api/settings/llm/test
  fastify.post<{ Body: LLMSettings }>("/settings/llm/test", async (req, reply) => {
    const parsed = llmSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: "Invalid settings" });
    }
    try {
      const response = await callLLM(parsed.data, [
        { role: "user", content: "Say hello in one word." },
      ]);
      if (response.content || response.finishReason) {
        return { ok: true };
      }
      return { ok: false, error: "No response from model" };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Connection failed" };
    }
  });
};

export default settingsRoutes;
