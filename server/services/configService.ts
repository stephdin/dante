import { configRepository } from "../repositories/configRepository.ts";
import type { Config, Provider } from "../../shared/types.ts";

// Returns the full client config (providers, assistants, presets, MCPs).
export async function getConfig(): Promise<Config> {
  return configRepository.getConfig();
}

// Resolves everything needed for a chat request in a single config read.
// This avoids hitting the repository (and later the DB) multiple times.
export async function resolveChatConfig(presetId?: string) {
  const config = await configRepository.getConfig();
  const modelId = resolveModelFromConfig(config, presetId);
  const provider = resolveProviderFromConfig(config, modelId);
  const instructions = resolveInstructionsFromConfig(config, presetId);
  return { modelId, provider, instructions };
}

// Pick the model id for a chat request: requested preset → default preset →
// first available model. Presets can reference models that don't exist; in that
// case we fall back through the chain rather than failing.
function resolveModelFromConfig(config: Config, presetId?: string): string {
  if (presetId) {
    const preset = config.presets.find((p) => p.id === presetId);
    if (preset) {
      const model = findModel(config, preset.modelId);
      if (model) return model.id;
    }
  }

  const defaultPreset = config.presets.find((p) => p.default);
  if (defaultPreset) {
    const model = findModel(config, defaultPreset.modelId);
    if (model) return model.id;
  }

  return config.providers[0]?.models[0]?.id ?? "";
}

// Find the provider that offers the resolved model. Falls back to the first
// configured provider so a chat request can still attempt to stream even when
// the model lookup is inconclusive.
function resolveProviderFromConfig(config: Config, modelId: string): Provider {
  for (const provider of config.providers) {
    if (provider.models.some((m) => m.id === modelId)) {
      return provider;
    }
  }
  return config.providers[0];
}

// Resolve the assistant system prompt for a preset (used as `instructions` in
// streamText). Returns undefined when no preset is given so the model runs
// without a system prompt.
function resolveInstructionsFromConfig(
  config: Config,
  presetId?: string,
): string | undefined {
  if (!presetId) return undefined;

  const preset = config.presets.find((p) => p.id === presetId);
  if (!preset) return undefined;

  const assistant = config.assistants.find((a) => a.id === preset.assistantId);
  return assistant?.prompt;
}

// Search all providers for a model by id. Providers own disjoint model lists,
// so the first match is the only match.
function findModel(config: Config, modelId: string) {
  for (const provider of config.providers) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) return model;
  }
  return undefined;
}
