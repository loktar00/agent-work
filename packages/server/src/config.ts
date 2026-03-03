import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const runnerConfigSchema = z.object({
  type: z.string(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

const configSchema = z.object({
  server: z
    .object({
      host: z.string().default("0.0.0.0"),
      port: z.number().int().min(1).max(65535).default(3000),
    })
    .default({}),
  database: z
    .object({
      path: z.string().default("./data/agent-board.db"),
    })
    .default({}),
  allowedCidrs: z.array(z.string()).optional(),
  skillsDirs: z.array(z.string()).default([]),
  runners: z.record(runnerConfigSchema).default({}),
});

export type AppConfig = z.infer<typeof configSchema>;
export type RunnerConfig = z.infer<typeof runnerConfigSchema>;

export function loadConfig(configPath?: string): AppConfig {
  const path = configPath ?? resolve(process.cwd(), "agent-board.yaml");

  if (!existsSync(path)) {
    return configSchema.parse({});
  }

  const raw = readFileSync(path, "utf-8");
  const parsed = parse(raw);
  return configSchema.parse(parsed ?? {});
}
