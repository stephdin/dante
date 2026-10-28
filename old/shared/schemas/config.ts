// Canonical Zod schemas for all config entities. These are the single source of
// truth for entity shapes — TS types are derived via `z.infer` and re-exported
// from `shared/types.ts`, so there is never drift between types and validation.
//
// Shared between server and client for validation consistency.
import { z } from "zod";

// ── Entity schemas ───────────────────────────────────────────────────────────

// Which AI SDK package a model is served through. Lives on the model, not
// the provider, because a single provider (e.g. OpenCode Go) can expose some
// models via /v1/chat/completions and others via /v1/messages.
export const sdkTypeSchema = z.enum(["openai-compatible", "anthropic"]);
export type SdkType = z.infer<typeof sdkTypeSchema>;

export const modelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: sdkTypeSchema,
});
export type Model = z.infer<typeof modelSchema>;

export const providerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  models: z.array(modelSchema).min(1),
});
export type Provider = z.infer<typeof providerSchema>;

export const assistantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  prompt: z.string().min(1),
});
export type Assistant = z.infer<typeof assistantSchema>;

export const mcpObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  transport: z.enum(["stdio", "http", "sse"]),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

export const mcpSchema = mcpObjectSchema.refine(
  (m) => (m.transport === "stdio" ? !!m.command : !!m.url),
  { message: "stdio transport requires command; http/sse requires url" },
);
export type Mcp = z.infer<typeof mcpSchema>;

export const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  iconId: z.string().min(1),
  modelId: z.string().min(1),
  assistantId: z.string().min(1),
  mcpIds: z.array(z.string()),
  default: z.boolean(),
});
export type Preset = z.infer<typeof presetSchema>;

// ── Full config schema with cross-entity validation ──────────────────────────

export const configSchema = z
  .object({
    providers: z.array(providerSchema),
    assistants: z.array(assistantSchema),
    mcps: z.array(mcpSchema),
    presets: z.array(presetSchema),
  })
  .superRefine((config, ctx) => {
    // Exactly one default preset (only when presets exist).
    const defaults = config.presets.filter((p) => p.default);
    if (config.presets.length > 0 && defaults.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `exactly one preset must be default, found ${defaults.length}`,
        path: ["presets"],
      });
    }

    // No duplicate IDs within each array.
    const checkUnique = <T extends { id: string }>(
      items: T[],
      label: string,
      path: (string | number)[],
    ) => {
      const ids = items.map((i) => i.id);
      const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
      for (const id of [...new Set(dupes)]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate ${label} id: "${id}"`,
          path,
        });
      }
    };
    checkUnique(config.providers, "provider", ["providers"]);
    checkUnique(config.assistants, "assistant", ["assistants"]);
    checkUnique(config.mcps, "mcp", ["mcps"]);
    checkUnique(config.presets, "preset", ["presets"]);

    // Unique model IDs within each provider.
    for (let i = 0; i < config.providers.length; i++) {
      checkUnique(config.providers[i].models, "model", [
        "providers",
        i,
        "models",
      ]);
    }

    // Referential integrity.
    const allModelIds = new Set(
      config.providers.flatMap((p) => p.models.map((m) => m.id)),
    );
    const allAssistantIds = new Set(config.assistants.map((a) => a.id));
    const allMcpIds = new Set(config.mcps.map((m) => m.id));

    for (let i = 0; i < config.presets.length; i++) {
      const p = config.presets[i];
      if (!allModelIds.has(p.modelId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `modelId "${p.modelId}" not found in any provider`,
          path: ["presets", i, "modelId"],
        });
      }
      if (!allAssistantIds.has(p.assistantId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `assistantId "${p.assistantId}" not found`,
          path: ["presets", i, "assistantId"],
        });
      }
      for (let j = 0; j < p.mcpIds.length; j++) {
        if (!allMcpIds.has(p.mcpIds[j])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `mcpId "${p.mcpIds[j]}" not found`,
            path: ["presets", i, "mcpIds", j],
          });
        }
      }
    }
  });

export type Config = z.infer<typeof configSchema>;
