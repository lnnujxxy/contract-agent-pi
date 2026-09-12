import type { AgentEvent } from "@earendil-works/pi-agent-core";

export type UiEvent = { kind: "text" | "status"; text: string };

export function formatAgentEvent(event: AgentEvent): UiEvent | undefined {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    return { kind: "text", text: event.assistantMessageEvent.delta };
  }
  if (event.type === "tool_execution_start") {
    return { kind: "status", text: `▶ ${event.toolName}` };
  }
  if (event.type === "tool_execution_end") {
    return { kind: "status", text: `${event.isError ? "✗" : "✓"} ${event.toolName}` };
  }
  if (event.type === "agent_end") {
    return { kind: "status", text: "■ Agent 已停止" };
  }
  return undefined;
}
