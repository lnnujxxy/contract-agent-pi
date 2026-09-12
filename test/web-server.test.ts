import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import type { AgentEvent } from "@earendil-works/pi-agent-core";

import { createContractWebServer, mapAgentEventToSse, sanitizeUploadName } from "../src/web/server.js";

test("sanitizes uploaded contract filenames", () => {
  assert.equal(sanitizeUploadName("../../客户 合同.pdf"), "客户-合同.pdf");
  assert.throws(() => sanitizeUploadName("payload.exe"), /unsupported contract format/i);
});

test("maps pi-mono events to browser-friendly SSE packets", () => {
  const packet = mapAgentEventToSse({
    type: "tool_execution_start",
    toolName: "read_contract",
    toolCallId: "1",
    args: {},
  } as AgentEvent);

  assert.deepEqual(packet, { event: "tool_start", data: { toolName: "read_contract" } });
});

test("serves the ChatPanel, accepts uploads and streams review events", async (context) => {
  const server = createContractWebServer({
    async reviewRunner(options) {
      options.onEvent?.({
        type: "message_update",
        assistantMessageEvent: { type: "text_delta", delta: "正在审查", contentIndex: 0, partial: {} },
      } as unknown as AgentEvent);
      return { jsonPath: "/tmp/review.json", markdownPath: "/tmp/review.md" };
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<chat-panel>/);

  const upload = await fetch(`${baseUrl}/api/upload?filename=${encodeURIComponent("demo contract.txt")}`, {
    method: "POST",
    body: "技术服务合同",
  });
  assert.equal(upload.status, 201);
  const uploaded = (await upload.json()) as { filePath: string };
  assert.match(uploaded.filePath, /uploads\/demo-contract\.txt$/);

  const chat = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "请审查", filePath: uploaded.filePath }),
  });
  const stream = await chat.text();
  assert.match(stream, /"event":"message_delta"/);
  assert.match(stream, /"event":"report"/);
  assert.match(stream, /"event":"done"/);
});
