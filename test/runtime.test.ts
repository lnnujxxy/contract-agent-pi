import assert from "node:assert/strict";
import test from "node:test";

import { createContractRuntime } from "../src/runtime.js";

test("creates a pi-mono agent with the contract tool chain", () => {
  const systemPrompt = "审查时必须逐块读取。TOKEN-runtime-prompt";
  const runtime = createContractRuntime({
    contractRoot: "/tmp/contracts",
    provider: "openai",
    model: "gpt-5-mini",
    systemPrompt,
  });

  assert.equal(runtime.agent.state.model.provider, "openai");
  assert.equal(runtime.agent.state.model.id, "gpt-5-mini");
  assert.deepEqual(
    runtime.agent.state.tools.map((tool) => tool.name),
    ["read_contract", "get_contract_chunk", "load_review_skill", "submit_contract_review"],
  );
  assert.equal(runtime.agent.state.systemPrompt, systemPrompt);
});

test("fails fast when the configured model does not exist", () => {
  assert.throws(
    () =>
      createContractRuntime({
        contractRoot: "/tmp/contracts",
        provider: "openai",
        model: "missing-model",
        systemPrompt: "unused",
      }),
    /unknown pi-ai model/i,
  );
});

test("supports a custom Anthropic model id and base URL used by local gateways", () => {
  const previousBaseUrl = process.env.ANTHROPIC_BASE_URL;
  process.env.ANTHROPIC_BASE_URL = "https://gateway.example.test/anthropic";
  try {
    const runtime = createContractRuntime({
      contractRoot: "/tmp/contracts",
      provider: "anthropic",
      model: "custom-sonnet",
      systemPrompt: "unused",
    });
    assert.equal(runtime.agent.state.model.id, "custom-sonnet");
    assert.equal(runtime.agent.state.model.baseUrl, "https://gateway.example.test/anthropic");
  } finally {
    if (previousBaseUrl === undefined) delete process.env.ANTHROPIC_BASE_URL;
    else process.env.ANTHROPIC_BASE_URL = previousBaseUrl;
  }
});
