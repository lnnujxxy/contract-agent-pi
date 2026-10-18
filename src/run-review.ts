import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";

import type { AgentEvent } from "@earendil-works/pi-agent-core";

import type { CliOptions } from "./cli-options.js";
import { formatReportMarkdown } from "./report.js";
import type { ReviewInstruction } from "./review-instruction.js";
import { composeTaskPrompt, loadReviewPrompts, reviewPromptDirectory } from "./review-prompts.js";
import { createContractRuntime, type ContractRuntime, type ContractRuntimeOptions } from "./runtime.js";
import type { ContractToolState } from "./tools.js";

interface ReviewRuntime {
  agent: {
    subscribe(listener: (event: AgentEvent) => void): void;
    prompt(input: string): Promise<void>;
    readonly state: { readonly errorMessage?: string };
  };
  state: ContractToolState;
}

export interface RunReviewOptions extends CliOptions {
  instruction: ReviewInstruction;
  onEvent?: (event: AgentEvent) => void;
}

export interface RunReviewDependencies {
  createRuntime?: (options: ContractRuntimeOptions) => ReviewRuntime;
}

function asReviewRuntime(runtime: ContractRuntime): ReviewRuntime {
  return {
    state: runtime.state,
    agent: {
      subscribe(listener) {
        runtime.agent.subscribe(listener);
      },
      prompt(input) {
        return runtime.agent.prompt(input);
      },
      get state() {
        return runtime.agent.state;
      },
    },
  };
}

export async function runReview(
  options: RunReviewOptions,
  dependencies: RunReviewDependencies = {},
): Promise<{ jsonPath: string; markdownPath: string }> {
  const contractPath = resolve(options.contractPath);
  const contractRoot = dirname(contractPath);
  const prompts = await loadReviewPrompts(reviewPromptDirectory(), contractPath);
  const taskPrompt = composeTaskPrompt(prompts.taskPrompt, options.instruction);
  const createRuntime =
    dependencies.createRuntime ??
    ((runtimeOptions: ContractRuntimeOptions) => asReviewRuntime(createContractRuntime(runtimeOptions)));
  const runtime = createRuntime({
    contractRoot,
    provider: options.provider,
    model: options.model,
    systemPrompt: prompts.systemPrompt,
    onAudit: (event) => {
      if (!event.allowed) process.stderr.write(`[safety] ${event.toolName}: ${event.reason ?? "blocked"}\n`);
    },
  });
  if (options.onEvent) runtime.agent.subscribe(options.onEvent);

  await runtime.agent.prompt(taskPrompt);
  if (!runtime.state.report) {
    throw new Error(runtime.agent.state.errorMessage ?? "Agent finished without submitting a structured review report");
  }

  const defaultName = basename(contractPath, extname(contractPath));
  const outputBase = resolve(options.outputBase ?? `reports/${defaultName}-review`);
  await mkdir(dirname(outputBase), { recursive: true });
  const jsonPath = `${outputBase}.json`;
  const markdownPath = `${outputBase}.md`;
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(runtime.state.report, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, formatReportMarkdown(runtime.state.report), "utf8"),
  ]);
  return { jsonPath, markdownPath };
}
