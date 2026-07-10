// SQLite-backed ConfigRepository. main.ts constructs one instance of this
// factory with the shared DB handle from getDb() and injects it into the
// services that need it; no module-eval-time singleton is involved.
//
// Reads assemble the normalized rows back into the nested `Config` shape. Writes
// are CRUD per entity; the `models` table is re-synced when a provider is
// created/updated, and `preset_mcps` is re-synced when a preset is
// created/updated — both inside transactions so a partial write can't leave the
// DB in an inconsistent state.
//
// All timestamps are ISO 8601 strings supplied from TS — SQLite's
// `datetime('now')` is intentionally avoided on writes so the server controls
// time and the format is consistent across app-visible columns.
// `created_at`/`updated_at` columns on these tables aren't surfaced to the
// frontend yet, but we set `updated_at` explicitly so a future
// "last edited" badge would have a consistent format.
import type { Database } from "@db/sqlite";
import type { ConfigRepository } from "../configRepository.ts";
import type {
  Assistant,
  Config,
  McpConnection,
  Model,
  Preset,
  Provider,
} from "../../../shared/types.ts";

// ── Row shapes (snake_case from the SQL schema) ─────────────────────────
type ProviderRow = {
  id: string;
  name: string;
  type: string;
  url: string;
  created_at: string;
  updated_at: string;
};

type ModelRow = {
  id: string;
  provider_id: string;
  name: string;
};

type AssistantRow = {
  id: string;
  name: string;
  prompt: string;
  created_at: string;
  updated_at: string;
};

type McpRow = {
  id: string;
  name: string;
  transport: string;
  status: "connected" | "disconnected";
  created_at: string;
  updated_at: string;
};

type PresetRow = {
  id: string;
  name: string;
  icon_id: string;
  model_id: string;
  assistant_id: string;
  is_default: number; // 0 / 1
  created_at: string;
  updated_at: string;
};

type PresetMcpRow = {
  preset_id: string;
  mcp_id: string;
};

// Input shapes (what the upper service passes in). `createMcp` omits id AND
// status (server pins status to "disconnected"); the other creates omit only id.
type CreateProviderInput = Omit<Provider, "id">;
type CreateAssistantInput = Omit<Assistant, "id">;
type CreateMcpInput = Omit<McpConnection, "id" | "status">;
type CreatePresetInput = Omit<Preset, "id">;

// ── assembleConfig: pure row → nested Config transformation ───────────────
// No SQL beyond what the caller already fetched. Models attach to their
// provider; preset.mcpIds is rebuilt from the preset_mcps junction.
function assembleConfig(rows: {
  providers: ProviderRow[];
  models: ModelRow[];
  assistants: AssistantRow[];
  mcps: McpRow[];
  presets: PresetRow[];
  presetMcps: PresetMcpRow[];
}): Config {
  // Group models by provider_id once; attach in insertion order (SQLite
  // preserves row insertion order, so this is stable).
  const modelsByProvider = new Map<string, Model[]>();
  for (const m of rows.models) {
    const list = modelsByProvider.get(m.provider_id) ?? [];
    list.push({ id: m.id, name: m.name });
    modelsByProvider.set(m.provider_id, list);
  }

  // Group mcp ids by preset_id for the junction table.
  const mcpsByPreset = new Map<string, string[]>();
  for (const link of rows.presetMcps) {
    const list = mcpsByPreset.get(link.preset_id) ?? [];
    list.push(link.mcp_id);
    mcpsByPreset.set(link.preset_id, list);
  }

  return {
    providers: rows.providers.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      url: p.url,
      models: modelsByProvider.get(p.id) ?? [],
    })),
    assistants: rows.assistants.map((a) => ({
      id: a.id,
      name: a.name,
      prompt: a.prompt,
    })),
    mcps: rows.mcps.map((m) => ({
      id: m.id,
      name: m.name,
      transport: m.transport,
      status: m.status,
    })),
    presets: rows.presets.map((p) => ({
      id: p.id,
      name: p.name,
      iconId: p.icon_id,
      modelId: p.model_id,
      assistantId: p.assistant_id,
      mcpIds: mcpsByPreset.get(p.id) ?? [],
      default: Boolean(p.is_default),
    })),
  };
}

export function createSqliteConfigRepository(
  db: Database,
): ConfigRepository {
  // In-memory cache of the assembled Config. Invalidated by every write
  // method below. The chat hot path calls resolveChatConfig → getConfig on
  // every /api/chat request, so caching turns 6 SELECT * into a pointer
  // return after the first read. Config is only mutated via these repo
  // methods, so write-time invalidation is sufficient — no other code path
  // touches these tables.
  let cached: Config | undefined;

  return {
    // ── Read ───────────────────────────────────────────────────────────
    // Six small reads; SQLite is fast and the config is tiny. Cached above
    // so the chat hot path (resolveChatConfig → getConfig per request) skips
    // the round-trips after the first read.
    async getConfig() {
      if (cached) return cached;
      const providers = db.prepare("SELECT * FROM providers").all<ProviderRow>();
      const models = db.prepare("SELECT * FROM models").all<ModelRow>();
      const assistants = db.prepare("SELECT * FROM assistants").all<AssistantRow>();
      const mcps = db.prepare("SELECT * FROM mcp_connections").all<McpRow>();
      const presets = db.prepare("SELECT * FROM presets").all<PresetRow>();
      const presetMcps = db.prepare("SELECT * FROM preset_mcps").all<PresetMcpRow>();
      cached = assembleConfig({ providers, models, assistants, mcps, presets, presetMcps });
      return cached;
    },

    // ── Providers ──────────────────────────────────────────────────────
    async createProvider(input: CreateProviderInput) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const provider: Provider = { id, ...input };
      db.transaction(() => {
        db.prepare(
          "INSERT INTO providers (id, name, type, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(id, input.name, input.type, input.url, now, now);
        const insertModel = db.prepare(
          "INSERT INTO models (id, provider_id, name) VALUES (?, ?, ?)",
        );
        for (const m of input.models) {
          insertModel.run(m.id, id, m.name);
        }
      })();
      cached = undefined;
      return provider;
    },

    async updateProvider(id, input) {
      const exists = db.prepare("SELECT 1 FROM providers WHERE id = ?").get(id);
      if (!exists) throw new Error("Provider not found");
      const now = new Date().toISOString();
      db.transaction(() => {
        db.prepare(
          "UPDATE providers SET name = ?, type = ?, url = ?, updated_at = ? WHERE id = ?",
        ).run(input.name, input.type, input.url, now, id);
        // Re-sync models: delete the old set, insert the new. ON DELETE
        // CASCADE on models.provider_id would also handle the delete, but
        // doing it explicitly keeps the transaction cohesive.
        db.prepare("DELETE FROM models WHERE provider_id = ?").run(id);
        const insertModel = db.prepare(
          "INSERT INTO models (id, provider_id, name) VALUES (?, ?, ?)",
        );
        for (const m of input.models) {
          insertModel.run(m.id, id, m.name);
        }
      })();
      cached = undefined;
    },

    async deleteProvider(id) {
      // ON DELETE CASCADE on models.provider_id removes the provider's models.
      // .run() returns the number of affected rows directly.
      const changes = db.prepare("DELETE FROM providers WHERE id = ?").run(id);
      if (changes === 0) throw new Error("Provider not found");
      cached = undefined;
    },

    // ── Assistants ─────────────────────────────────────────────────────
    async createAssistant(input: CreateAssistantInput) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const assistant: Assistant = { id, ...input };
      db.prepare(
        "INSERT INTO assistants (id, name, prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run(id, input.name, input.prompt, now, now);
      cached = undefined;
      return assistant;
    },

    async updateAssistant(id, input) {
      const exists = db.prepare("SELECT 1 FROM assistants WHERE id = ?").get(id);
      if (!exists) throw new Error("Assistant not found");
      const now = new Date().toISOString();
      db.prepare(
        "UPDATE assistants SET name = ?, prompt = ?, updated_at = ? WHERE id = ?",
      ).run(input.name, input.prompt, now, id);
      cached = undefined;
    },

    async deleteAssistant(id) {
      // FK → assistants ON DELETE RESTRICT: the DB throws if a preset still
      // references this assistant. configService checks "in use" first and
      // returns 409, so this is a safety net — let the FK error propagate
      // rather than swallowing it.
      const changes = db.prepare("DELETE FROM assistants WHERE id = ?").run(id);
      if (changes === 0) throw new Error("Assistant not found");
      cached = undefined;
    },

    // ── MCPs ────────────────────────────────────────────────────────────
    async createMcp(input: CreateMcpInput) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      // Server pins status to "disconnected" on creation — new MCPs start
      // disconnected until someone connects them.
      const mcp: McpConnection = {
        id,
        name: input.name,
        transport: input.transport,
        status: "disconnected",
      };
      db.prepare(
        "INSERT INTO mcp_connections (id, name, transport, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(id, input.name, input.transport, "disconnected", now, now);
      cached = undefined;
      return mcp;
    },

    async updateMcp(id, input) {
      const exists = db.prepare("SELECT 1 FROM mcp_connections WHERE id = ?").get(id);
      if (!exists) throw new Error("MCP not found");
      const now = new Date().toISOString();
      // status is intentionally not written here — it's server-managed
      // (created as "disconnected", advanced by the future MCP connection
      // lifecycle). Clients can update name/transport only.
      db.prepare(
        "UPDATE mcp_connections SET name = ?, transport = ?, updated_at = ? WHERE id = ?",
      ).run(input.name, input.transport, now, id);
      cached = undefined;
    },

    async deleteMcp(id) {
      // ON DELETE CASCADE on preset_mcps.mcp_id removes the junction rows.
      const changes = db.prepare("DELETE FROM mcp_connections WHERE id = ?").run(id);
      if (changes === 0) throw new Error("MCP not found");
      cached = undefined;
    },

    // ── Presets ────────────────────────────────────────────────────────
    async createPreset(input: CreatePresetInput) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const preset: Preset = { id, ...input };
      db.transaction(() => {
        // Clear other defaults first. The partial unique index
        // idx_presets_single_default (migration v2) rejects a second
        // is_default = 1 row at INSERT time, so clearing before our own
        // INSERT keeps the invariant inside this transaction.
        if (input.default) {
          db.prepare(
            "UPDATE presets SET is_default = 0, updated_at = ? WHERE is_default = 1",
          ).run(now);
        }
        db.prepare(
          "INSERT INTO presets (id, name, icon_id, model_id, assistant_id, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          id,
          input.name,
          input.iconId,
          input.modelId,
          input.assistantId,
          input.default ? 1 : 0,
          now,
          now,
        );
        // Re-sync preset_mcps from input.mcpIds. Empty list is fine.
        const link = db.prepare(
          "INSERT INTO preset_mcps (preset_id, mcp_id) VALUES (?, ?)",
        );
        for (const mcpId of input.mcpIds) {
          link.run(id, mcpId);
        }
      })();
      cached = undefined;
      return preset;
    },

    async updatePreset(id, input) {
      const exists = db.prepare("SELECT 1 FROM presets WHERE id = ?").get(id);
      if (!exists) throw new Error("Preset not found");
      const now = new Date().toISOString();
      db.transaction(() => {
        // Clear other defaults first (excluding self). Order matters: SQLite
        // checks the partial unique index at statement time, so without
        // this the UPDATE of our own row to is_default = 1 would trip the
        // index while another default still exists.
        if (input.default) {
          db.prepare(
            "UPDATE presets SET is_default = 0, updated_at = ? WHERE is_default = 1 AND id != ?",
          ).run(now, id);
        }
        db.prepare(
          "UPDATE presets SET name = ?, icon_id = ?, model_id = ?, assistant_id = ?, is_default = ?, updated_at = ? WHERE id = ?",
        ).run(
          input.name,
          input.iconId,
          input.modelId,
          input.assistantId,
          input.default ? 1 : 0,
          now,
          id,
        );
        // Re-sync preset_mcps: delete existing junction rows, re-insert.
        db.prepare("DELETE FROM preset_mcps WHERE preset_id = ?").run(id);
        const link = db.prepare(
          "INSERT INTO preset_mcps (preset_id, mcp_id) VALUES (?, ?)",
        );
        for (const mcpId of input.mcpIds) {
          link.run(id, mcpId);
        }
      })();
      cached = undefined;
    },

    async deletePreset(id) {
      // ON DELETE CASCADE on preset_mcps.preset_id removes the junction rows.
      const changes = db.prepare("DELETE FROM presets WHERE id = ?").run(id);
      if (changes === 0) throw new Error("Preset not found");
      cached = undefined;
    },
  };
}