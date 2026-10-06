import { Agent } from "@earendil-works/pi-agent-core";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";

import type { SafetyAuditEvent } from "./safety-hooks.js";
import { createSafetyHooks } from "./safety-hooks.js";
import { createContractTools, type ContractToolState } from "./tools.js";

export interface ContractRuntimeOptions {
  contractRoot: string;
  provider: string;
  model: string;
  systemPrompt: string;
  maxChunkChars?: number;
  overlapChars?: number;
  onAudit?: (event: SafetyAuditEvent) => void;
}

export interface ContractRuntime {
  agent: Agent;
  state: ContractToolState;
}

export function createContractRuntime(options: ContractRuntimeOptions): ContractRuntime {
  const models = builtinModels();
  const catalogModel = models.getModel(options.provider, options.model);
  const anthropicTemplate =
    options.provider === "anthropic" ? models.getModel("anthropic", "claude-sonnet-4-6") : undefined;
  if (!catalogModel && !anthropicTemplate) {
    throw new Error(`Unknown pi-ai model: ${options.provider}/${options.model}`);
  }
  const model = {
    ...(catalogModel ?? anthropicTemplate!),
    id: options.model,
    name: catalogModel?.name ?? options.model,
    ...(options.provider === "anthropic" && process.env.ANTHROPIC_BASE_URL
      ? { baseUrl: process.env.ANTHROPIC_BASE_URL }
      : {}),
  };

  const { tools, state } = createContractTools({
    contractRoot: options.contractRoot,
    ...(options.maxChunkChars === undefined ? {} : { maxChunkChars: options.maxChunkChars }),
    ...(options.overlapChars === undefined ? {} : { overlapChars: options.overlapChars }),
  });
  const safetyHooks = createSafetyHooks({
    contractRoot: options.contractRoot,
    ...(options.onAudit === undefined ? {} : { onAudit: options.onAudit }),
  });

  const agent = new Agent({
    streamFn: (activeModel, context, streamOptions) => models.streamSimple(activeModel, context, streamOptions),
    initialState: {
      model,
      thinkingLevel: "medium",
      systemPrompt: options.systemPrompt,
      tools,
    },
    beforeToolCall: safetyHooks.beforeToolCall,
    afterToolCall: safetyHooks.afterToolCall,
    toolExecution: "sequential",
  });

  return { agent, state };
}
