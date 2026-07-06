// Canonical Zod schemas for all config entities. These are the single source of
// truth for entity shapes — TS types are derived via `z.infer` and re-exported
// from `shared/types.ts`, so there is never drift between types and validation.
//
// The settings forms reuse these schemas for client-side validation; the backend
// handlers use them (optionally `omit({ id: true })` for create) to validate
// request bodies. Same schema, same rules, both sides.
import { z } from "zod";

export const modelSchema = z.object({
  id: z.string().min(1, "Modell-ID darf nicht leer sein"),
  name: z.string().min(1, "Modellname darf nicht leer sein"),
});
export type Model = z.infer<typeof modelSchema>;

export const providerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name darf nicht leer sein"),
  type: z.string().min(1, "Typ darf nicht leer sein"),
  url: z.string().url("Gültige URL erforderlich (z.B. https://api.example.com)"),
  models: z.array(modelSchema),
});
export type Provider = z.infer<typeof providerSchema>;

export const assistantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name darf nicht leer sein"),
  prompt: z.string().min(1, "Prompt darf nicht leer sein"),
});
export type Assistant = z.infer<typeof assistantSchema>;

// status mirrors the SQLite CHECK in mcp_connections — change both together.
export const mcpConnectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name darf nicht leer sein"),
  transport: z.string().min(1, "Transport-Typ darf nicht leer sein"),
  status: z.enum(["connected", "disconnected"]),
});
export type McpConnection = z.infer<typeof mcpConnectionSchema>;

export const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name darf nicht leer sein"),
  iconId: z.string().min(1),
  modelId: z.string().min(1, "Modell muss ausgewählt sein"),
  assistantId: z.string().min(1, "Assistent muss ausgewählt sein"),
  mcpIds: z.array(z.string().min(1)),
  default: z.boolean(),
});
export type Preset = z.infer<typeof presetSchema>;

export const configSchema = z.object({
  providers: z.array(providerSchema),
  assistants: z.array(assistantSchema),
  mcps: z.array(mcpConnectionSchema),
  presets: z.array(presetSchema),
});
export type Config = z.infer<typeof configSchema>;
