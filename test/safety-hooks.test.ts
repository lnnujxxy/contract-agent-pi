import assert from "node:assert/strict";
import test from "node:test";

import type { AfterToolCallContext, BeforeToolCallContext } from "@earendil-works/pi-agent-core";

import { createSafetyHooks } from "../src/safety-hooks.js";

test("beforeToolCall blocks contract paths outside the root", async () => {
  const hooks = createSafetyHooks({ contractRoot: "/workspace/contracts" });
  const result = await hooks.beforeToolCall?.({
    toolCall: { type: "toolCall", id: "1", name: "read_contract", arguments: { path: "/etc/passwd" } },
    args: { path: "/etc/passwd" },
  } as unknown as BeforeToolCallContext);

  assert.equal(result?.block, true);
  assert.match(result?.reason ?? "", /outside the allowed contract root/i);
});

test("afterToolCall redacts sensitive text before it reaches events or the model", async () => {
  const hooks = createSafetyHooks({ contractRoot: "/workspace/contracts" });
  const result = await hooks.afterToolCall?.({
    result: {
      content: [{ type: "text", text: "联系电话 13812345678" }],
      details: { safe: true },
    },
  } as unknown as AfterToolCallContext);

  assert.equal(result?.content?.[0]?.type, "text");
  assert.doesNotMatch(result?.content?.[0]?.type === "text" ? result.content[0].text : "", /13812345678/);
});
