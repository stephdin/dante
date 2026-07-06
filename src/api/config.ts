import type {
  Provider,
  Assistant,
  McpConnection,
  Preset,
} from "@shared/types.ts";

import { apiPost, apiPut, apiDelete } from "./client.ts";
import { invalidateConfig } from "./queries.ts";

const done = () => invalidateConfig();

// Providers
export const createProvider = (input: Omit<Provider, "id">) =>
  apiPost<Provider>("/config/providers", input).then((p) => (done(), p));

export const updateProvider = (id: string, input: Provider) =>
  apiPut(`/config/providers/${id}`, input).then(done);

export const deleteProvider = (id: string) =>
  apiDelete(`/config/providers/${id}`).then(done);

// Assistants
export const createAssistant = (input: Omit<Assistant, "id">) =>
  apiPost<Assistant>("/config/assistants", input).then((a) => (done(), a));

export const updateAssistant = (id: string, input: Assistant) =>
  apiPut(`/config/assistants/${id}`, input).then(done);

export const deleteAssistant = (id: string) =>
  apiDelete(`/config/assistants/${id}`).then(done);

// MCPs
export const createMcp = (input: Omit<McpConnection, "id">) =>
  apiPost<McpConnection>("/config/mcps", input).then((m) => (done(), m));

export const updateMcp = (id: string, input: McpConnection) =>
  apiPut(`/config/mcps/${id}`, input).then(done);

export const deleteMcp = (id: string) =>
  apiDelete(`/config/mcps/${id}`).then(done);

// Presets
export const createPreset = (input: Omit<Preset, "id">) =>
  apiPost<Preset>("/config/presets", input).then((p) => (done(), p));

export const updatePreset = (id: string, input: Preset) =>
  apiPut(`/config/presets/${id}`, input).then(done);

export const deletePreset = (id: string) =>
  apiDelete(`/config/presets/${id}`).then(done);
