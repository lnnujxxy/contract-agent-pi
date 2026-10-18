import assert from "node:assert/strict";
import test from "node:test";

import { MAX_REVIEW_INSTRUCTION_CHARS, parseReviewInstruction } from "../src/review-instruction.js";

test("rejects blank review instructions and strips control characters", () => {
  assert.throws(() => parseReviewInstruction("  \n"), /review instruction is required/i);
  assert.throws(() => parseReviewInstruction(12), /review instruction is required/i);
  assert.equal(parseReviewInstruction("请审查\u0000付款").text, "请审查付款");
  assert.throws(
    () => parseReviewInstruction("审".repeat(MAX_REVIEW_INSTRUCTION_CHARS + 1)),
    /exceeds/i,
  );
});
