/**
 * API endpoint smoke tests.
 *
 * Runs against a running Dante server. Start the server first with
 * `deno task dev`, then run these tests in another terminal:
 *
 *   deno task test:api
 *
 * Set the env vars or rely on defaults:
 *   DANTE_BASE_URL  — default http://localhost:3000
 *   DANTE_API_TOKEN — default 1337
 */

const BASE = Deno.env.get("DANTE_BASE_URL") ?? "http://localhost:3000";
const TOKEN = Deno.env.get("DANTE_API_TOKEN") ?? "1337";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

async function req(
  method: string,
  path: string,
  token?: string,
  data?: unknown,
) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (data) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, text };
}

// ── Tests ────────────────────────────────────────────────────────────────────

console.log(`\nTesting ${BASE}\n`);

let sharedJobId = "";

// Health
console.log("Health");
{
  const res = await req("GET", "/api/health");
  assert(res.status === 200, "GET /api/health → 200");
  assert(res.text === "ok", 'GET /api/health → body "ok"');
}

// Auth
console.log("\nAuth");
{
  const noToken = await req("GET", "/api/conversations");
  assert(noToken.status === 401, "no token → 401");
  assert(
    (noToken.body as Record<string, unknown>)?.error?.code === "unauthorized",
    "no token → error code",
  );

  const wrong = await req("GET", "/api/conversations", "wrongtoken");
  assert(wrong.status === 401, "wrong token → 401");
  assert(
    (wrong.body as Record<string, unknown>)?.error?.code === "unauthorized",
    "wrong token → error code",
  );
}

// Conversations
console.log("\nConversations");
{
  // Clean up any leftover conversations from previous runs so the list starts
  // empty and the count assertions below are deterministic.
  const existing = await req("GET", "/api/conversations", TOKEN);
  for (const c of existing.body as Array<{ id: string }>) {
    await req("DELETE", `/api/conversations/${c.id}`, TOKEN);
  }

  // List (empty initially)
  const r1 = await req("GET", "/api/conversations", TOKEN);
  assert(r1.status === 200, "GET /api/conversations → 200");
  assert(Array.isArray(r1.body), "GET → returns array");
  assert((r1.body as unknown[]).length === 0, "GET → empty list");

  // Create
  const r2 = await req("POST", "/api/conversations", TOKEN, { label: "Test" });
  assert(r2.status === 201, "POST /api/conversations → 201");
  const conv = r2.body as Record<string, unknown>;
  assert(typeof conv?.id === "string", "POST → has id");
  assert(conv?.label === "Test", "POST → label set");
  const convId = conv.id as string;

  // Create without label → defaults
  const r3 = await req("POST", "/api/conversations", TOKEN, {});
  assert(r3.status === 201, "POST without label → 201");
  assert(
    (r3.body as Record<string, unknown>)?.label === "New conversation",
    "POST without label → default label",
  );

  // List (should have 2 now)
  const r4 = await req("GET", "/api/conversations", TOKEN);
  assert((r4.body as unknown[]).length === 2, "GET → 2 conversations");

  // Get by id
  const r5 = await req("GET", `/api/conversations/${convId}`, TOKEN);
  assert(r5.status === 200, "GET /api/conversations/:id → 200");
  assert(
    (r5.body as Record<string, unknown>)?.label === "Test",
    "GET → correct label",
  );

  // Get nonexistent → 404
  const r6 = await req("GET", "/api/conversations/nope", TOKEN);
  assert(r6.status === 404, "GET nonexistent → 404");

  // Update
  const r7 = await req("PATCH", `/api/conversations/${convId}`, TOKEN, {
    label: "Renamed",
  });
  assert(r7.status === 200, "PATCH → 200");
  assert(
    (r7.body as Record<string, unknown>)?.label === "Renamed",
    "PATCH → label updated",
  );

  // Update without label → 400
  const r8 = await req("PATCH", `/api/conversations/${convId}`, TOKEN, {});
  assert(r8.status === 400, "PATCH without label → 400");

  // Delete
  const r9 = await req("DELETE", `/api/conversations/${convId}`, TOKEN);
  assert(r9.status === 200, "DELETE → 200");

  // Delete again → 404
  const r10 = await req("DELETE", `/api/conversations/${convId}`, TOKEN);
  assert(r10.status === 404, "DELETE again → 404");

  // List (should have 1 left)
  const r11 = await req("GET", "/api/conversations", TOKEN);
  assert((r11.body as unknown[]).length === 1, "GET → 1 left after delete");
}

// Chat
console.log("\nChat");
{
  // Set up config with a default preset (needed for chat)
  const chatConfig = {
    providers: [
      {
        id: "test",
        name: "Test",
        url: "https://example.com/v1",
        models: [
          { id: "test-model", name: "Test Model", type: "openai-compatible" },
        ],
      },
    ],
    assistants: [
      { id: "default", name: "Default", prompt: "You are helpful." },
    ],
    mcps: [],
    presets: [
      {
        id: "default",
        name: "Default",
        iconId: "star",
        modelId: "test-model",
        assistantId: "default",
        mcpIds: [],
        default: true,
      },
    ],
  };
  await req("PUT", "/api/config", TOKEN, chatConfig);

  // Create a conversation
  const conv = await req("POST", "/api/conversations", TOKEN, {
    label: "Chat test",
  });
  const convId = (conv.body as Record<string, unknown>).id as string;

  // Send a message
  const r1 = await req("POST", "/api/chat", TOKEN, {
    conversationId: convId,
    text: "Hello, world!",
  });
  assert(r1.status === 200, "POST /api/chat → 200");
  const result = r1.body as Record<string, unknown>;
  assert(typeof result?.jobId === "string", "POST → has jobId");
  assert(typeof result?.messageId === "string", "POST → has messageId");
  sharedJobId = result.jobId as string;

  // Verify conversation shows the user message and generating assistant
  await new Promise((r) => setTimeout(r, 300));
  const r2 = await req("GET", `/api/conversations/${convId}`, TOKEN);
  const full = r2.body as Record<string, unknown>;
  const msgs = full?.messages as Array<Record<string, unknown>>;
  assert(msgs?.length === 2, "conversation has 2 messages");
  assert(msgs?.[0]?.role === "user", "first message is user");
  assert(msgs?.[1]?.role === "assistant", "second message is assistant");
  // presetId is persisted per-message so the input can default to the
  // last-used preset on reload and statistics can label which model made the
  // reply.
  assert(msgs?.[0]?.presetId === "default", "user message carries presetId");
  assert(
    msgs?.[1]?.presetId === "default",
    "assistant message carries presetId",
  );

  // Explicit presetId override should be respected end-to-end.
  const conv2 = await req("POST", "/api/conversations", TOKEN, {});
  const conv2Id = (conv2.body as Record<string, unknown>).id as string;
  // Add a second preset to the config so the override has something to point to.
  // `default` is required (exactly one preset must be default), so the new
  // preset explicitly opts out.
  await req("PUT", "/api/config", TOKEN, {
    ...chatConfig,
    presets: [
      ...chatConfig.presets,
      {
        id: "alt",
        name: "Alt",
        iconId: "star",
        modelId: "test-model",
        assistantId: "default",
        mcpIds: [],
        default: false,
      },
    ],
  });
  const r2b = await req("POST", "/api/chat", TOKEN, {
    conversationId: conv2Id,
    text: "Hello alt",
    presetId: "alt",
  });
  assert(r2b.status === 200, "POST /api/chat with explicit presetId → 200");
  await new Promise((r) => setTimeout(r, 200));
  const r2c = await req("GET", `/api/conversations/${conv2Id}`, TOKEN);
  const altMsgs = (r2c.body as Record<string, unknown>).messages as Array<
    Record<string, unknown>
  >;
  assert(
    altMsgs?.[0]?.presetId === "alt",
    "explicit presetId persisted on user message",
  );
  assert(
    altMsgs?.[1]?.presetId === "alt",
    "explicit presetId persisted on assistant message",
  );

  // Error cases
  const r3 = await req("POST", "/api/chat", TOKEN, { text: "hi" });
  assert(r3.status === 400, "POST without conversationId → 400");

  const r4 = await req("POST", "/api/chat", TOKEN, {
    conversationId: "nope",
    text: "hi",
  });
  assert(r4.status === 404, "POST nonexistent conversation → 404");
}

// Messages
console.log("\nMessages");
{
  // Create a fresh conversation so the shared chat/job used by other tests
  // is not affected.
  const conv = await req("POST", "/api/conversations", TOKEN, {
    label: "Messages test",
  });
  const convId = (conv.body as Record<string, unknown>).id as string;

  const chatRes = await req("POST", "/api/chat", TOKEN, {
    conversationId: convId,
    text: "Hello actions",
  });
  assert(chatRes.status === 200, "POST /api/chat for actions → 200");
  const chatResult = chatRes.body as Record<string, unknown>;
  const assistantId = chatResult.messageId as string;

  await new Promise((r) => setTimeout(r, 300));
  const convData = await req("GET", `/api/conversations/${convId}`, TOKEN);
  const msgs = (convData.body as Record<string, unknown>)?.messages as Array<
    Record<string, unknown>
  >;
  const userId = msgs?.find((m) => m.role === "user")?.id as string;
  const actualAssistantId = msgs?.find((m) => m.role === "assistant")
    ?.id as string;
  assert(actualAssistantId === assistantId, "action test assistant id matches");

  // Cancel the in-flight job so the assistant doesn't change mid-test.
  const actionJobId = chatResult.jobId as string;
  await req("POST", `/api/jobs/${actionJobId}/cancel`, TOKEN);

  // Star the assistant message.
  const star = await req("PATCH", `/api/messages/${assistantId}`, TOKEN, {
    starred: true,
  });
  assert(star.status === 200, "PATCH /api/messages/:id star → 200");
  assert(
    (star.body as Record<string, unknown>)?.starred === true,
    "star → message is starred",
  );

  const starredConv = await req("GET", `/api/conversations/${convId}`, TOKEN);
  const starredMsgs = (starredConv.body as Record<string, unknown>)
    ?.messages as Array<Record<string, unknown>>;
  assert(
    starredMsgs?.find((m) => m.id === assistantId)?.starred === true,
    "star → persisted in conversation",
  );

  // Delete the assistant message.
  const del = await req("DELETE", `/api/messages/${assistantId}`, TOKEN);
  assert(del.status === 200, "DELETE /api/messages/:id → 200");
  const afterDelete = await req("GET", `/api/conversations/${convId}`, TOKEN);
  const afterDeleteMsgs = (afterDelete.body as Record<string, unknown>)
    ?.messages as Array<Record<string, unknown>>;
  assert(afterDeleteMsgs?.length === 1, "delete → assistant removed");
  assert(afterDeleteMsgs?.[0]?.role === "user", "delete → user remains");

  // Regenerate the user message (creates a new assistant placeholder).
  const regenerate = await req(
    "POST",
    `/api/messages/${userId}/regenerate`,
    TOKEN,
  );
  assert(regenerate.status === 200, "POST /api/messages/:id/regenerate → 200");
  const regeneratedId = (regenerate.body as Record<string, unknown>)
    ?.messageId as string;
  assert(typeof regeneratedId === "string", "regenerate → returns messageId");
  const afterRegenerate = await req(
    "GET",
    `/api/conversations/${convId}`,
    TOKEN,
  );
  const afterRegenerateMsgs = (afterRegenerate.body as Record<string, unknown>)
    ?.messages as Array<Record<string, unknown>>;
  assert(
    afterRegenerateMsgs?.length === 2,
    "regenerate → assistant placeholder created",
  );
  const regeneratedAssistant = afterRegenerateMsgs?.find(
    (m) => m.id === regeneratedId,
  );
  assert(
    regeneratedAssistant?.role === "assistant",
    "regenerate → new assistant",
  );
  assert(
    regeneratedAssistant?.status === "generating",
    "regenerate → assistant is generating",
  );
}

// Jobs
console.log("\nJobs");
{
  // GET nonexistent → 404
  const r1 = await req("GET", "/api/jobs/nope", TOKEN);
  assert(r1.status === 404, "GET nonexistent job → 404");

  // GET completed job (from chat test above)
  const r2 = await req("GET", `/api/jobs/${sharedJobId}`, TOKEN);
  assert(r2.status === 200, "GET /api/jobs/:id → 200");
  const jobStatus = (r2.body as Record<string, unknown>)?.status;
  assert(typeof jobStatus === "string", "GET → has status");

  // Cancel: create a chat and cancel immediately
  const conv2 = await req("POST", "/api/conversations", TOKEN, {});
  const convId2 = (conv2.body as Record<string, unknown>).id as string;

  const chat = await req("POST", "/api/chat", TOKEN, {
    conversationId: convId2,
    text: "Cancel me",
  });
  const cancelJobId = (chat.body as Record<string, unknown>).jobId as string;

  const r3 = await req("POST", `/api/jobs/${cancelJobId}/cancel`, TOKEN);
  assert(r3.status === 200, "POST /api/jobs/:id/cancel → 200");

  // Verify job is cancelled
  const r4 = await req("GET", `/api/jobs/${cancelJobId}`, TOKEN);
  assert(
    (r4.body as Record<string, unknown>)?.status === "cancelled",
    "cancel → job status is cancelled",
  );

  // Cancel already-cancelled → 409
  const r5 = await req("POST", `/api/jobs/${cancelJobId}/cancel`, TOKEN);
  assert(r5.status === 409, "cancel again → 409");
}

// Config
console.log("\nConfig");
{
  // GET returns default empty config
  const r1 = await req("GET", "/api/config", TOKEN);
  assert(r1.status === 200, "GET /api/config → 200");
  const cfg = r1.body as Record<string, unknown>;
  assert(Array.isArray(cfg?.providers), "GET → has providers array");
  assert(Array.isArray(cfg?.presets), "GET → has presets array");

  // PUT with invalid body → 422
  const r2 = await req("PUT", "/api/config", TOKEN, { invalid: true });
  assert(r2.status === 422, "PUT invalid config → 422");

  // PUT with valid self-contained config → 200
  const selfContained = {
    providers: [
      {
        id: "openai",
        name: "OpenAI",
        url: "https://api.openai.com/v1",
        models: [{ id: "gpt-4", name: "GPT-4", type: "openai-compatible" }],
      },
    ],
    assistants: [
      { id: "default", name: "Default", prompt: "You are helpful." },
    ],
    mcps: [],
    presets: [
      {
        id: "default",
        name: "Default",
        iconId: "star",
        modelId: "gpt-4",
        assistantId: "default",
        mcpIds: [],
        default: true,
      },
    ],
  };
  const r4 = await req("PUT", "/api/config", TOKEN, selfContained);
  assert(r4.status === 200, "PUT valid config → 200");
  const returned = r4.body as Record<string, unknown>;
  assert(
    (returned?.providers as Array<unknown>)?.length === 1,
    "PUT → returned config has 1 provider",
  );

  // Re-GET confirms persistence
  const r5 = await req("GET", "/api/config", TOKEN);
  assert(r5.status === 200, "GET after PUT → 200");
  const reloaded = r5.body as Record<string, unknown>;
  assert(
    (reloaded?.providers as Array<unknown>)?.length === 1,
    "GET after PUT → provider persisted",
  );
}

// WebSocket
console.log("\nWebSocket");
{
  // Connect with valid token
  const wsUrl = BASE.replace("http", "ws") + `/api/events?token=${TOKEN}`;
  const ws = new WebSocket(wsUrl);

  await new Promise<void>((resolve) => {
    ws.onopen = () => resolve();
  });
  assert(ws.readyState === WebSocket.OPEN, "WS connects");

  // Subscribe to a conversation
  ws.send(JSON.stringify({ type: "subscribe", conversationId: "ws-test" }));

  // Unsubscribe
  ws.send(JSON.stringify({ type: "unsubscribe", conversationId: "ws-test" }));

  ws.close();
  await new Promise((r) => setTimeout(r, 100));
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) Deno.exit(1);
