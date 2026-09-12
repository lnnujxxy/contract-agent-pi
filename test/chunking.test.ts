import assert from "node:assert/strict";
import test from "node:test";

import { chunkContract } from "../src/chunking.js";

test("chunks long contracts on paragraph boundaries with stable ids", () => {
  const text = [
    "第一条 合同目的\n本合同用于测试。",
    "第二条 付款\n甲方应在十日内付款。",
    "第三条 违约\n逾期付款按每日千分之五承担违约金。",
  ].join("\n\n");

  const chunks = chunkContract(text, { maxChars: 38, overlapChars: 8 });

  assert.ok(chunks.length >= 2);
  assert.deepEqual(chunks.map((chunk) => chunk.id), chunks.map((_, i) => `chunk-${i + 1}`));
  assert.ok(chunks.every((chunk) => chunk.text.length <= 46));
  assert.equal(chunks.map((chunk) => chunk.text).join("\n").includes("第三条 违约"), true);
});

test("keeps short contracts in one chunk", () => {
  const chunks = chunkContract("第一条 本合同即时生效。", { maxChars: 200, overlapChars: 20 });

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]?.text, "第一条 本合同即时生效。");
});

test("prefers chapter and clause boundaries even when the source has no blank lines", () => {
  const text = [
    "第一章 总则",
    "本章说明合同目的和适用范围。",
    "第1条 服务范围",
    "乙方提供系统开发和维护服务。",
    "第2条 付款",
    "甲方在验收后十日内付款。",
  ].join("\n");

  const chunks = chunkContract(text, { maxChars: 42, overlapChars: 0 });

  assert.ok(chunks.length >= 2);
  assert.ok(chunks.some((chunk) => chunk.text.startsWith("第1条 服务范围")));
  assert.ok(chunks.some((chunk) => chunk.text.startsWith("第2条 付款")));
});
