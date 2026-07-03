import type { Config, Conversation } from "../../../shared/types.ts";

// Mock data used by the current repository implementations. No persistence,
// no auth: this is the single source of truth the API serves to the frontend.
// Will later be replaced by a SQLite-backed repository without touching
// services or handlers.

export const config: Config = {
  providers: [
    {
      id: "provider-opencode",
      name: "OpenCode Go",
      type: "OpenAI-kompatibel",
      url: "https://opencode.ai/zen/go/v1",
      // All models below use the /v1/chat/completions endpoint and work with
      // @ai-sdk/openai-compatible. Model ids ARE the OpenCode Go model ids.
      models: [
        { id: "glm-5.2", name: "GLM-5.2" },
        { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
        { id: "kimi-k2.7-code", name: "Kimi K2.7 Code" },
        { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
      ],
    },
    {
      id: "provider-llamacpp",
      name: "llama.cpp",
      type: "Lokal",
      url: "http://localhost:8080",
      models: [
        { id: "llama-3.1-8b", name: "llama-3.1-8b" },
        { id: "mistral-7b", name: "mistral-7b" },
      ],
    },
  ],
  assistants: [
    {
      id: "assistant",
      name: "Assistant",
      prompt: "Answer precise and useful.",
    },
    {
      id: "assistant-coding",
      name: "Coding-Agent",
      prompt:
        "Du bist Dante, ein erfahrener Coding-Agent. Antworte präzise und nützlich.",
    },
    {
      id: "assistant-lektor",
      name: "Lektor",
      prompt:
        "Du bist ein gründlicher Lektor. Verbessere Texte für Klarheit und Lesbarkeit.",
    },
  ],
  mcps: [
    { id: "mcp-fs", name: "Filesystem", transport: "stdio", status: "connected" },
    { id: "mcp-github", name: "GitHub", transport: "SSE", status: "disconnected" },
  ],
  presets: [
    {
      id: "preset-pro",
      name: "Dante Pro",
      iconId: "sparkles",
      modelId: "glm-5.2",
      assistantId: "assistant-coding",
      mcpIds: ["mcp-fs", "mcp-github"],
      default: true,
    },
    {
      id: "preset-fast",
      name: "Dante Fast",
      iconId: "bolt",
      modelId: "deepseek-v4-flash",
      assistantId: "assistant",
      mcpIds: [],
      default: false,
    },
    {
      id: "preset-reasoning",
      name: "Dante Reasoning",
      iconId: "brain",
      modelId: "kimi-k2.7-code",
      assistantId: "assistant-coding",
      mcpIds: ["mcp-fs"],
      default: false,
    },
  ],
};

export const conversations: Conversation[] = [
  {
    id: "1",
    label: "Wie async/await funktioniert",
    createdAt: "2026-06-27T12:00:00.000Z",
    updatedAt: "2026-07-01T12:01:00.000Z",
    messages: [
      {
        id: "1-1",
        role: "assistant",
        text:
          "Hallo! Ich bin Dante, dein Coding-Agent. Frag mich alles über TypeScript, React oder dein Projekt.",
        createdAt: "2026-06-27T12:00:00.000Z",
      },
      {
        id: "1-2",
        role: "user",
        text: "Kannst du erklären, wie async/await in TypeScript funktioniert?",
        createdAt: "2026-06-27T12:01:00.000Z",
      },
      {
        id: "1-3",
        role: "assistant",
        text:
          "Klar! `async` markiert eine Funktion so, dass sie immer ein Promise zurückgibt, während `await` die Ausführung innerhalb einer `async`-Funktion pausiert, bis das Promise erledigt ist. So kannst du asynchronen Code schreiben, der sich von oben nach unten liest wie synchroner Code.",
        createdAt: "2026-06-27T12:02:00.000Z",
      },
      {
        id: "1-4",
        role: "user",
        text: "Schön. Und wie funktioniert die Fehlerbehandlung damit?",
        createdAt: "2026-06-28T12:00:00.000Z",
      },
      {
        id: "1-5",
        role: "assistant",
        starred: true,
        text:
          "Du umschließt den await-Aufruf mit einem try/catch-Block. Wenn das Promise abgelehnt wird, wird die Ablehnung zu einem geworfenen Fehler, den du lokal abfangen kannst. Um Fehler nicht zu verschlucken, wirf sie erneut oder gib sie an den Aufrufer weiter.\n\nBeispiel:\ntry {\n  const data = await fetch('/api');\n} catch (err) {\n  console.error('Anfrage fehlgeschlagen', err);\n  throw err;\n}",
        createdAt: "2026-06-28T12:01:00.000Z",
      },
      {
        id: "1-6",
        role: "user",
        text: "Was ist mit dem parallelen Ausführen von Promises?",
        createdAt: "2026-06-28T12:30:00.000Z",
      },
      {
        id: "1-7",
        role: "assistant",
        text:
          "Verwende Promise.all, um unabhängige Promises gemeinsam zu starten und als Gruppe abzuwarten. Es wird aufgelöst, sobald alle erfolgreich sind, oder beim ersten Fehlschlagen abgelehnt.\n\nconst [a, b] = await Promise.all([fetchUser(), fetchPosts()]);",
        createdAt: "2026-06-28T12:31:00.000Z",
      },
      {
        id: "1-8",
        role: "user",
        text: "Verstanden. Eine letzte Sache — wann sollte ich Top-Level await verwenden?",
        createdAt: "2026-06-28T12:45:00.000Z",
      },
      {
        id: "1-9",
        role: "assistant",
        text:
          "Top-Level await funktioniert nur in ES-Modulen und blockiert die Modul-Auswertung, bis das Promise aufgelöst wird. Es ist praktisch für die App-Startkonfiguration oder das Initialisieren eines Moduls aus einer asynchronen Quelle, aber zu viel davon verlangsamt Kaltlades. Verwende es sparsam.",
        createdAt: "2026-06-28T12:46:00.000Z",
      },
      {
        id: "1-10",
        role: "user",
        text: "Noch einmal dazu — bricht Promise.all bei der ersten Ablehnung ab?",
        createdAt: "2026-07-01T12:00:00.000Z",
      },
      {
        id: "1-11",
        role: "assistant",
        text:
          "Ja. Promise.all wird abgelehnt, sobald ein Promise abgelehnt wird, aber die anderen Promises laufen weiter (sie werden nicht abgebrochen). Wenn du auf alle warten willst, unabhängig von Fehlern, verwende stattdessen Promise.allSettled.",
        createdAt: "2026-07-01T12:01:00.000Z",
      },
    ],
  },
  {
    id: "2",
    label: "Ideen zur Reiseplanung",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:01:00.000Z",
    messages: [
      {
        id: "2-1",
        role: "user",
        text: "Plane eine Reise nach Japan für zwei Wochen im Herbst.",
        createdAt: "2026-07-01T10:00:00.000Z",
      },
      {
        id: "2-2",
        role: "assistant",
        text:
          "Hier sind ein paar Reiserouten-Optionen für deine Reise: Tokio (3 Tage) → Hakone (1 Tag) → Kyoto (4 Tage) → Osaka (2 Tage) → Hiroshima (1 Tag) → Miyajima (1 Tag). Falls du mehr Zeit hast, lohnt sich ein Abstecher nach Nara oder Kanazawa.",
        createdAt: "2026-07-01T10:01:00.000Z",
      },
    ],
  },
  {
    id: "3",
    label: "CSS-Gap-Problem beheben",
    createdAt: "2026-06-26T09:00:00.000Z",
    updatedAt: "2026-06-26T09:01:00.000Z",
    messages: [
      {
        id: "3-1",
        role: "user",
        text: "Warum bricht mein CSS-Gap zusammen, wenn ich die Spalten reduziere?",
        createdAt: "2026-06-26T09:00:00.000Z",
      },
      {
        id: "3-2",
        role: "assistant",
        text:
          "Der Gap bricht zusammen, weil das Elternelement kein Flex-Container ist. Setze `display: flex` (oder `grid`) auf den Container, damit `gap` wirkt. Bei Inline-Elementen hat `gap` keine Auswirkung.",
        createdAt: "2026-06-26T09:01:00.000Z",
      },
    ],
  },
];
