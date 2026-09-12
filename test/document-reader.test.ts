import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { readContractDocument } from "../src/document-reader.js";

test("reads a UTF-8 text contract and returns metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "contract-agent-"));
  const file = join(root, "采购合同.txt");
  await writeFile(file, "采购合同\n甲方向乙方采购设备。", "utf8");

  const result = await readContractDocument(file, root);

  assert.equal(result.fileName, "采购合同.txt");
  assert.equal(result.format, "txt");
  assert.match(result.text, /采购设备/);
  assert.ok(result.sha256.length === 64);
});

test("refuses unsupported files", async () => {
  const root = await mkdtemp(join(tmpdir(), "contract-agent-"));
  const file = join(root, "contract.exe");
  await writeFile(file, "not a contract", "utf8");

  await assert.rejects(() => readContractDocument(file, root), /unsupported contract format/i);
});
