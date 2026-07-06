import type {
  Config,
  Provider,
  Assistant,
  McpConnection,
  Preset,
} from "../../shared/types.ts";
import { createSqliteConfigRepository } from "./sqlite/configSqlite.ts";
import { getDb } from "./sqlite/db.ts";

export interface ConfigRepository {
  getConfig(): Promise<Config>;
  createProvider(input: Omit<Provider, "id">): Promise<Provider>;
  updateProvider(id: string, input: Provider): Promise<void>;
  deleteProvider(id: string): Promise<void>;
  createAssistant(input: Omit<Assistant, "id">): Promise<Assistant>;
  updateAssistant(id: string, input: Assistant): Promise<void>;
  deleteAssistant(id: string): Promise<void>;
  createMcp(input: Omit<McpConnection, "id" | "status">): Promise<McpConnection>;
  updateMcp(id: string, input: McpConnection): Promise<void>;
  deleteMcp(id: string): Promise<void>;
  createPreset(input: Omit<Preset, "id">): Promise<Preset>;
  updatePreset(id: string, input: Preset): Promise<void>;
  deletePreset(id: string): Promise<void>;
}

// SQLite-backed singleton. The DB is opened (and migrations run) the first time
// this module is imported, via getDb().
export const configRepository: ConfigRepository =
  createSqliteConfigRepository(getDb());