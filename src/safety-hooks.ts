import type {
  AfterToolCallContext,
  AfterToolCallResult,
  BeforeToolCallContext,
  BeforeToolCallResult,
} from "@earendil-works/pi-agent-core";

import { assertPathInsideRoot, redactSensitiveText } from "./security.js";

export interface SafetyAuditEvent {
  phase: "before" | "after";
  toolName: string;
  allowed: boolean;
  reason?: string;
}

export interface SafetyHookOptions {
  contractRoot: string;
  onAudit?: (event: SafetyAuditEvent) => void;
}

export function createSafetyHooks(options: SafetyHookOptions): {
  beforeToolCall: (context: BeforeToolCallContext) => Promise<BeforeToolCallResult | undefined>;
  afterToolCall: (context: AfterToolCallContext) => Promise<AfterToolCallResult | undefined>;
} {
  return {
    async beforeToolCall(context) {
      if (context.toolCall.name !== "read_contract") {
        options.onAudit?.({ phase: "before", toolName: context.toolCall.name, allowed: true });
        return undefined;
      }

      const path = (context.args as { path?: unknown }).path;
      if (typeof path !== "string") {
        const reason = "read_contract requires a string path";
        options.onAudit?.({ phase: "before", toolName: context.toolCall.name, allowed: false, reason });
        return { block: true, reason };
      }

      try {
        assertPathInsideRoot(options.contractRoot, path);
        options.onAudit?.({ phase: "before", toolName: context.toolCall.name, allowed: true });
        return undefined;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Contract path rejected";
        options.onAudit?.({ phase: "before", toolName: context.toolCall.name, allowed: false, reason });
        return { block: true, reason };
      }
    },

    async afterToolCall(context) {
      options.onAudit?.({ phase: "after", toolName: context.toolCall?.name ?? "unknown", allowed: !context.isError });
      const content = context.result.content.map((item) =>
        item.type === "text" ? { ...item, text: redactSensitiveText(item.text) } : item,
      );
      return { content };
    },
  };
}
