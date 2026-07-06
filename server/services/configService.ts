import { configRepository } from "../repositories/configRepository.ts";
import { AppError } from "../lib/errors.ts";
import type {
  Config,
  Provider,
  Assistant,
  McpConnection,
  Preset,
} from "../../shared/types.ts";

// ── Read ─────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<Config> {
  return configRepository.getConfig();
}

// ── Providers ────────────────────────────────────────────────────────────

export async function createProvider(
  input: Omit<Provider, "id">,
): Promise<Provider> {
  return configRepository.createProvider(input);
}

export async function updateProvider(id: string, input: Provider): Promise<void> {
  await ensureProviderExists(id);
  return configRepository.updateProvider(id, input);
}

export async function deleteProvider(id: string): Promise<void> {
  const config = await configRepository.getConfig();
  const provider = config.providers.find((p) => p.id === id);
  if (!provider) throw new AppError("Provider not found", 404);

  // Check if any preset references a model from this provider.
  const modelIds = new Set(provider.models.map((m) => m.id));
  const blockedBy = config.presets.filter((p) => modelIds.has(p.modelId));
  if (blockedBy.length > 0) {
    throw new AppError(
      `Provider in use by presets: ${blockedBy.map((p) => p.name).join(", ")}`,
      409,
    );
  }

  return configRepository.deleteProvider(id);
}

// ── Assistants ───────────────────────────────────────────────────────────

export async function createAssistant(
  input: Omit<Assistant, "id">,
): Promise<Assistant> {
  return configRepository.createAssistant(input);
}

export async function updateAssistant(
  id: string,
  input: Assistant,
): Promise<void> {
  await ensureAssistantExists(id);
  return configRepository.updateAssistant(id, input);
}

export async function deleteAssistant(id: string): Promise<void> {
  const config = await configRepository.getConfig();
  if (!config.assistants.find((a) => a.id === id)) {
    throw new AppError("Assistant not found", 404);
  }

  const blockedBy = config.presets.filter((p) => p.assistantId === id);
  if (blockedBy.length > 0) {
    throw new AppError(
      `Assistant in use by presets: ${blockedBy.map((p) => p.name).join(", ")}`,
      409,
    );
  }

  return configRepository.deleteAssistant(id);
}

// ── MCPs ─────────────────────────────────────────────────────────────────

export async function createMcp(
  input: Omit<McpConnection, "id" | "status">,
): Promise<McpConnection> {
  return configRepository.createMcp(input);
}

export async function updateMcp(id: string, input: McpConnection): Promise<void> {
  await ensureMcpExists(id);
  return configRepository.updateMcp(id, input);
}

export async function deleteMcp(id: string): Promise<void> {
  const config = await configRepository.getConfig();
  if (!config.mcps.find((m) => m.id === id)) {
    throw new AppError("MCP not found", 404);
  }

  const blockedBy = config.presets.filter((p) => p.mcpIds.includes(id));
  if (blockedBy.length > 0) {
    throw new AppError(
      `MCP in use by presets: ${blockedBy.map((p) => p.name).join(", ")}`,
      409,
    );
  }

  return configRepository.deleteMcp(id);
}

// ── Presets ──────────────────────────────────────────────────────────────

export async function createPreset(
  input: Omit<Preset, "id">,
): Promise<Preset> {
  const preset = await configRepository.createPreset(input);
  if (preset.default) {
    await clearOtherDefaults(preset.id);
  }
  return preset;
}

export async function updatePreset(id: string, input: Preset): Promise<void> {
  await ensurePresetExists(id);
  if (input.default) {
    await clearOtherDefaults(id);
  }
  return configRepository.updatePreset(id, input);
}

export async function deletePreset(id: string): Promise<void> {
  const config = await configRepository.getConfig();
  if (!config.presets.find((p) => p.id === id)) {
    throw new AppError("Preset not found", 404);
  }
  return configRepository.deletePreset(id);
}

// ── Chat config resolution (unchanged) ───────────────────────────────────

export async function resolveChatConfig(presetId?: string) {
  const config = await configRepository.getConfig();
  const modelId = resolveModelFromConfig(config, presetId);
  const provider = resolveProviderFromConfig(config, modelId);
  const instructions = resolveInstructionsFromConfig(config, presetId);
  return { modelId, provider, instructions };
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function ensureProviderExists(id: string): Promise<void> {
  const config = await configRepository.getConfig();
  if (!config.providers.find((p) => p.id === id)) {
    throw new AppError("Provider not found", 404);
  }
}

async function ensureAssistantExists(id: string): Promise<void> {
  const config = await configRepository.getConfig();
  if (!config.assistants.find((a) => a.id === id)) {
    throw new AppError("Assistant not found", 404);
  }
}

async function ensureMcpExists(id: string): Promise<void> {
  const config = await configRepository.getConfig();
  if (!config.mcps.find((m) => m.id === id)) {
    throw new AppError("MCP not found", 404);
  }
}

async function ensurePresetExists(id: string): Promise<void> {
  const config = await configRepository.getConfig();
  if (!config.presets.find((p) => p.id === id)) {
    throw new AppError("Preset not found", 404);
  }
}

// Set default = false on every preset except the one being saved.
async function clearOtherDefaults(presetId: string): Promise<void> {
  const config = await configRepository.getConfig();
  for (const preset of config.presets) {
    if (preset.id !== presetId && preset.default) {
      preset.default = false;
      await configRepository.updatePreset(preset.id, preset);
    }
  }
}

// ── Resolution helpers (unchanged) ───────────────────────────────────────

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

function resolveProviderFromConfig(config: Config, modelId: string): Provider {
  for (const provider of config.providers) {
    if (provider.models.some((m) => m.id === modelId)) return provider;
  }
  return config.providers[0];
}

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

function findModel(config: Config, modelId: string) {
  for (const provider of config.providers) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) return model;
  }
  return undefined;
}
