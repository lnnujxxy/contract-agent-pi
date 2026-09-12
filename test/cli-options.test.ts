import assert from "node:assert/strict";
import test from "node:test";

import { parseCliOptions } from "../src/cli-options.js";

test("parses contract path and optional model settings", () => {
  const options = parseCliOptions([
    "contracts/demo.pdf",
    "--provider",
    "deepseek",
    "--model",
    "deepseek-v4-flash",
    "--output",
    "reports/demo",
  ]);

  assert.equal(options.contractPath, "contracts/demo.pdf");
  assert.equal(options.provider, "deepseek");
  assert.equal(options.model, "deepseek-v4-flash");
  assert.equal(options.outputBase, "reports/demo");
});

test("requires a contract path", () => {
  assert.throws(() => parseCliOptions([]), /usage:/i);
});

test("infers Anthropic settings from Codex-compatible environment variables", () => {
  const previous = {
    provider: process.env.CONTRACT_AGENT_PROVIDER,
    model: process.env.CONTRACT_AGENT_MODEL,
    token: process.env.ANTHROPIC_AUTH_TOKEN,
    sonnet: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
  };
  delete process.env.CONTRACT_AGENT_PROVIDER;
  delete process.env.CONTRACT_AGENT_MODEL;
  process.env.ANTHROPIC_AUTH_TOKEN = "test-token";
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = "custom-sonnet";
  try {
    const options = parseCliOptions(["contract.md"]);
    assert.equal(options.provider, "anthropic");
    assert.equal(options.model, "custom-sonnet");
  } finally {
    for (const [key, value] of Object.entries({
      CONTRACT_AGENT_PROVIDER: previous.provider,
      CONTRACT_AGENT_MODEL: previous.model,
      ANTHROPIC_AUTH_TOKEN: previous.token,
      ANTHROPIC_DEFAULT_SONNET_MODEL: previous.sonnet,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
