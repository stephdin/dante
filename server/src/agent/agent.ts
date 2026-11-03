import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import {
  convertToModelMessages,
  generateText,
  isStepCount,
  streamText,
  type LanguageModel,
  type UIMessage,
} from "ai"
import { connectMcp } from "./mcp.ts"

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
export type TitleGenerator = typeof generateTitle

/**
 * One agent turn: the AI SDK runs the tool loop until the model is done.
 * The caller must call `close` once the stream has ended.
 */
export async function streamAgent(
  messages: UIMessage[],
  abortSignal: AbortSignal
) {
  const mcp = await connectMcp()
  try {
    const result = streamText({
      model: createModel(),
      messages: await convertToModelMessages(messages),
      tools: mcp.tools,
      stopWhen: isStepCount(20),
      abortSignal,
    })
    return { result, close: mcp.close }
  } catch (error) {
    await mcp.close()
    throw error
  }
}

const TITLE_SYSTEM =
  "You name chat conversations. Reply with a title of at most six words, " +
  "in the language of the message. No quotes, no punctuation at the end."

// Small models answer a bare question instead of naming it, so the message
// goes into tags with the instruction around it.
const titleRequest = (message: string) =>
  "Write a title for the chat message below. Do not answer or reply to " +
  "the message, only name its topic. Write the title in the same language " +
  "as the message: a German message gets a German title, an English " +
  "message an English title.\n\n" +
  `<message>\n${message}\n</message>`

/** Summarizes the first prompt as a title. Undefined if the model gives nothing. */
export async function generateTitle(prompt: string) {
  const { text } = await generateText({
    model: createModel(),
    system: TITLE_SYSTEM,
    prompt: titleRequest(prompt.slice(0, 2000)),
    maxOutputTokens: 40,
    temperature: 0.2,
    // Reasoning models would spend the whole budget thinking. llama.cpp
    // passes this to the chat template; other servers ignore it.
    providerOptions: {
      dante: { chat_template_kwargs: { enable_thinking: false } },
    },
  })
  // Small models sometimes add reasoning or a second attempt, separated by
  // a line break or a stray <think> tag. The first piece is the title.
  const title = text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .split(/<\/?think>|\n/)
    .map((piece) => piece.replace(/^["'„“*#\s]+|["'“”*.\s]+$/g, ""))
    .find(Boolean)
  return title?.slice(0, 80)
}
