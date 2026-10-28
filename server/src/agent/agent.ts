import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type LanguageModel,
  type UIMessage,
} from "ai"

// Configured through env vars for now; this moves into the settings later.
function createModel(): LanguageModel {
  const {
    DANTE_MODEL_TYPE,
    DANTE_MODEL_URL,
    DANTE_MODEL_ID,
    DANTE_MODEL_API_KEY,
  } = process.env
  if (!DANTE_MODEL_URL || !DANTE_MODEL_ID) {
    throw new Error("DANTE_MODEL_URL and DANTE_MODEL_ID must be set")
  }
  if (DANTE_MODEL_TYPE === "anthropic") {
    return createAnthropic({
      baseURL: DANTE_MODEL_URL,
      apiKey: DANTE_MODEL_API_KEY,
    })(DANTE_MODEL_ID)
  }
  return createOpenAICompatible({
    name: "dante",
    baseURL: DANTE_MODEL_URL,
    apiKey: DANTE_MODEL_API_KEY,
  })(DANTE_MODEL_ID)
}

export type Agent = typeof streamAgent

/** One agent turn: the AI SDK runs the tool loop until the model is done. */
export async function streamAgent(
  messages: UIMessage[],
  abortSignal: AbortSignal
) {
  return streamText({
    model: createModel(),
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(20),
    abortSignal,
  })
}
