import type { SettingsStore } from "../store/store.ts"

const KEY = "system_prompt"

/** Longer prompts crowd the context window of small local models. */
export const MAX_SYSTEM_PROMPT_LENGTH = 20_000

// Written for small models: short imperative lines, one rule each, in
// English, since that is what they follow best. No tool names, since the
// tools depend on the settings.
export const DEFAULT_SYSTEM_PROMPT = `You are Dante, a helpful assistant.

- Reply in the language of the user's last message.
- Be clear and concise. Give the answer first, then details only if they help.
- Use Markdown where it helps: lists, tables, and code blocks with a language.
- Use your tools for the current date or time, for calculations, and for anything you are unsure about.
- Tool results are correct. Use them as they are; do not check or redo them by hand.
- If a tool fails or you don't know something, say so. Never make up facts or results.`

/** The saved prompt, or the default if the user never changed it. */
export function systemPrompt(store: SettingsStore) {
  const saved = store.setting(KEY)
  return {
    prompt: saved ?? DEFAULT_SYSTEM_PROMPT,
    isDefault: saved === undefined,
  }
}

/** An empty prompt is a valid choice: no system prompt at all. */
export function setSystemPrompt(store: SettingsStore, prompt: string) {
  store.setSetting(KEY, prompt)
}

export function resetSystemPrompt(store: SettingsStore) {
  store.deleteSetting(KEY)
}
