import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { log } from "./log.ts";

// Builds an OpenAI-compatible provider for any base URL.
// The caller supplies the provider id/name, base URL, and API key so this
// stays agnostic to the actual backend.
export function createModelProvider(
  name: string,
  baseURL: string,
  apiKey: string,
) {
  return createOpenAICompatible({
    name,
    apiKey,
    baseURL,
    fetch: (input, init) => {
      if (init?.body) {
        log("REQ_OUT", `→ ${String(input)}\n${init.body}`);
      }
      return fetch(input, init);
    },
  });
}
