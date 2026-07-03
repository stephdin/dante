import type { Config } from "../../shared/types.ts";
import { config } from "./mock/mockData.ts";

export interface ConfigRepository {
  getConfig(): Promise<Config>;
}

// Returns the static mock config. Will later be replaced by a SQLite-backed
// implementation without touching services or handlers.
export const configRepository: ConfigRepository = {
  async getConfig() {
    return config;
  },
};
