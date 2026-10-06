import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadReviewPrompts } from "../src/review-prompts.js";

test("substitutes the contract path into the task prompt", async () => {
  const root = await mkdtemp(join(tmpdir(), "contract-prompts-ok-"));
  await writeFile(join(root, "system.md"), "审查时必须逐块读取。", "utf8");
  await writeFile(join(root, "task.md"), "请审查合同 {{contractPath}}。", "utf8");

  const loaded = await loadReviewPrompts(root, "/contracts/a.pdf");

  assert.equal(loaded.systemPrompt, "审查时必须逐块读取。");
  assert.equal(loaded.taskPrompt, "请审查合同 /contracts/a.pdf。");
});

test("fails when a review prompt file is missing or the task has no contract path placeholder", async () => {
  const missingDir = await mkdtemp(join(tmpdir(), "contract-prompts-missing-"));
  await assert.rejects(
    () => loadReviewPrompts(missingDir, "/contracts/a.pdf"),
    /Missing review prompt file: .*system\.md/,
  );

  const placeholderDir = await mkdtemp(join(tmpdir(), "contract-prompts-placeholder-"));
  await writeFile(join(placeholderDir, "system.md"), "系统提示", "utf8");
  await writeFile(join(placeholderDir, "task.md"), "请审查合同。", "utf8");
  await assert.rejects(
    () => loadReviewPrompts(placeholderDir, "/contracts/a.pdf"),
    /Review task prompt is missing \{\{contractPath\}\}/,
  );
});
