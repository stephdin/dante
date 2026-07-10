import type { ConfigRepository } from "../repositories/configRepository.ts";
import { AppError } from "../lib/errors.ts";
import type {
  Config,
  Provider,
  Assistant,
  McpConnection,
  Preset,
} from "../../shared/types.ts";

// Factory: builds a ConfigService bound to the supplied repository. All
// cross-entity rules ("in use by preset", defaults uniqueness) live here; the
// repository is a plain CRUD boundary. The repository is injected by `main.ts`
// (or a test), so this module no longer reaches for a module-eval-time
// singleton.
export function createConfigService(repo: ConfigRepository) {
  return {
    // ── Read ─────────────────────────────────────────────────────────────

    async getConfig(): Promise<Config> {
      return repo.getConfig();
    },

    // ── Providers ───────────────────────────────────────────────────────

    async createProvider(
      input: Omit<Provider, "id">,
    ): Promise<Provider> {
      return repo.createProvider(input);
    },

    async updateProvider(id: string, input: Provider): Promise<void> {
      await ensureProviderExists(id);
      return repo.updateProvider(id, input);
    },

    async deleteProvider(id: string): Promise<void> {
      const config = await repo.getConfig();
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

      return repo.deleteProvider(id);
    },

    // ── Assistants ───────────────────────────────────────────────────────

    async createAssistant(
      input: Omit<Assistant, "id">,
    ): Promise<Assistant> {
      return repo.createAssistant(input);
    },

    async updateAssistant(
      id: string,
      input: Assistant,
    ): Promise<void> {
      await ensureAssistantExists(id);
      return repo.updateAssistant(id, input);
    },

    async deleteAssistant(id: string): Promise<void> {
      const config = await repo.getConfig();
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

      return repo.deleteAssistant(id);
    },

    // ── MCPs ────────────────────────────────────────────────────────────

    async createMcp(
      input: Omit<McpConnection, "id" | "status">,
    ): Promise<McpConnection> {
      return repo.createMcp(input);
    },

    async updateMcp(
      id: string,
      input: Omit<McpConnection, "id" | "status">,
    ): Promise<void> {
      await ensureMcpExists(id);
      return repo.updateMcp(id, input);
    },

    async deleteMcp(id: string): Promise<void> {
      const config = await repo.getConfig();
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

      return repo.deleteMcp(id);
    },

    // ── Presets ─────────────────────────────────────────────────────────
    // "Clear other defaults" is enforced inside the repo's createPreset/
    // updatePreset transaction (see configSqlite.ts) — both for atomicity and
    // so the partial unique index idx_presets_single_default can't reject the
    // write mid-transaction. Previously this happened here, after the write,
    // in its own loop of separate updatePreset transactions.

    async createPreset(
      input: Omit<Preset, "id">,
    ): Promise<Preset> {
      return repo.createPreset(input);
    },

    async updatePreset(id: string, input: Preset): Promise<void> {
      await ensurePresetExists(id);
      return repo.updatePreset(id, input);
    },

    async deletePreset(id: string): Promise<void> {
      const config = await repo.getConfig();
      if (!config.presets.find((p) => p.id === id)) {
        throw new AppError("Preset not found", 404);
      }
      return repo.deletePreset(id);
    },

    // ── Chat config resolution ──────────────────────────────────────────

    async resolveChatConfig(presetId?: string) {
      const config = await repo.getConfig();
      const modelId = resolveModelFromConfig(config, presetId);
      const provider = resolveProviderFromConfig(config, modelId);
      const instructions = resolveInstructionsFromConfig(config, presetId);
      return { modelId, provider, instructions };
    },
  };

  // ── Helpers (closures over `repo`) ────────────────────────────────────

  async function ensureProviderExists(id: string): Promise<void> {
    const config = await repo.getConfig();
    if (!config.providers.find((p) => p.id === id)) {
      throw new AppError("Provider not found", 404);
    }
  }

  async function ensureAssistantExists(id: string): Promise<void> {
    const config = await repo.getConfig();
    if (!config.assistants.find((a) => a.id === id)) {
      throw new AppError("Assistant not found", 404);
    }
  }

  async function ensureMcpExists(id: string): Promise<void> {
    const config = await repo.getConfig();
    if (!config.mcps.find((m) => m.id === id)) {
      throw new AppError("MCP not found", 404);
    }
  }

  async function ensurePresetExists(id: string): Promise<void> {
    const config = await repo.getConfig();
    if (!config.presets.find((p) => p.id === id)) {
      throw new AppError("Preset not found", 404);
    }
  }
}

export type ConfigService = ReturnType<typeof createConfigService>;

// ── Resolution helpers (pure, no repo needed) ────────────────────────────

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