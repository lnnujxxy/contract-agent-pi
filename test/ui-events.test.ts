import assert from "node:assert/strict";
import test from "node:test";

import type { AgentEvent } from "@earendil-works/pi-agent-core";

import { formatAgentEvent } from "../src/ui-events.js";

test("formats streaming text and tool progress for CLI/TUI adapters", () => {
  const delta = formatAgentEvent({
    type: "message_update",
    assistantMessageEvent: { type: "text_delta", delta: "正在审查", contentIndex: 0, partial: {} },
  } as unknown as AgentEvent);
  const tool = formatAgentEvent({ type: "tool_execution_start", toolName: "read_contract" } as AgentEvent);

  assert.deepEqual(delta, { kind: "text", text: "正在审查" });
  assert.deepEqual(tool, { kind: "status", text: "▶ read_contract" });
});
