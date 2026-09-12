import { Agent } from "@earendil-works/pi-agent-core";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";

import type { SafetyAuditEvent } from "./safety-hooks.js";
import { createSafetyHooks } from "./safety-hooks.js";
import { createContractTools, type ContractToolState } from "./tools.js";

const SYSTEM_PROMPT = `你是企业内部合同审查 Agent。你的目标是给出可审计、证据充分的风险报告，而不是代替律师作出最终法律判断。

工作顺序必须是：
1. 调用 load_review_skill 加载审查方法；
2. 调用 read_contract 读取、分类和分块合同；
3. 按 chunkIds 逐块调用 get_contract_chunk，不得跳块；
4. 合并重复问题，严格区分原文事实与推断；
5. 调用 submit_contract_review 返回结构化报告并结束。

敏感信息已由本地安全管道脱敏。禁止请求网络工具、禁止写回原合同、禁止编造不存在的条款。`;

export interface ContractRuntimeOptions {
  contractRoot: string;
  provider: string;
  model: string;
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
      systemPrompt: SYSTEM_PROMPT,
      tools,
    },
    beforeToolCall: safetyHooks.beforeToolCall,
    afterToolCall: safetyHooks.afterToolCall,
    toolExecution: "sequential",
  });

  return { agent, state };
}
