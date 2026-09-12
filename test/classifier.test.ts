import assert from "node:assert/strict";
import test from "node:test";

import { classifyContract } from "../src/classifier.js";

test("classifies a software service agreement with confidence and evidence", () => {
  const result = classifyContract(`
    软件服务合同
    甲方委托乙方提供 SaaS 平台、技术支持和系统维护服务。
    服务期限为一年，并按月支付服务费。
  `);

  assert.equal(result.type, "software_service");
  assert.ok(result.confidence >= 0.7);
  assert.ok(result.evidence.some((item) => item.includes("SaaS")));
});

test("returns unknown instead of inventing a contract type", () => {
  const result = classifyContract("甲乙双方经友好协商，就有关事项达成一致。");

  assert.equal(result.type, "unknown");
  assert.ok(result.confidence < 0.5);
});
