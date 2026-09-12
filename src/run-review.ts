import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";

import type { AgentEvent } from "@earendil-works/pi-agent-core";

import type { CliOptions } from "./cli-options.js";
import { formatReportMarkdown } from "./report.js";
import { createContractRuntime } from "./runtime.js";

export interface RunReviewOptions extends CliOptions {
  onEvent?: (event: AgentEvent) => void;
}

export async function runReview(options: RunReviewOptions): Promise<{ jsonPath: string; markdownPath: string }> {
  const contractPath = resolve(options.contractPath);
  const contractRoot = dirname(contractPath);
  const runtime = createContractRuntime({
    contractRoot,
    provider: options.provider,
    model: options.model,
    onAudit: (event) => {
      if (!event.allowed) process.stderr.write(`[safety] ${event.toolName}: ${event.reason ?? "blocked"}\n`);
    },
  });
  if (options.onEvent) runtime.agent.subscribe(options.onEvent);

  await runtime.agent.prompt(
    `请审查合同 ${contractPath}。严格按系统规定逐块读取，完成后必须调用 submit_contract_review。`,
  );
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
