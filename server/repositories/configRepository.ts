import type {
  Config,
  Provider,
  Assistant,
  McpConnection,
  Preset,
} from "../../shared/types.ts";

// Repository contract for config entities. The concrete SQLite implementation
// lives in `./sqlite/configSqlite.ts`; `main.ts` is the only place that decides
// which implementation to construct, so tests can swap in a fake against this
// interface without going through the module-eval-time singleton that used to
// live here.
export interface ConfigRepository {
  getConfig(): Promise<Config>;
  createProvider(input: Omit<Provider, "id">): Promise<Provider>;
  updateProvider(id: string, input: Provider): Promise<void>;
  deleteProvider(id: string): Promise<void>;
  createAssistant(input: Omit<Assistant, "id">): Promise<Assistant>;
  updateAssistant(id: string, input: Assistant): Promise<void>;
  deleteAssistant(id: string): Promise<void>;
  createMcp(input: Omit<McpConnection, "id" | "status">): Promise<McpConnection>;
  // status is server-managed (created as "disconnected", mutated only by the
  // future MCP connection lifecycle), so update accepts name/transport only.
  updateMcp(id: string, input: Omit<McpConnection, "id" | "status">): Promise<void>;
  deleteMcp(id: string): Promise<void>;
  createPreset(input: Omit<Preset, "id">): Promise<Preset>;
  updatePreset(id: string, input: Preset): Promise<void>;
  deletePreset(id: string): Promise<void>;
}