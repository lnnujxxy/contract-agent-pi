import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createContractTools } from "../src/tools.js";

test("tool chain loads, classifies and chunks a contract without leaking raw text in details", async () => {
  const root = await mkdtemp(join(tmpdir(), "contract-tools-"));
  const file = join(root, "software.txt");
  await writeFile(
    file,
    "软件服务合同\n\n乙方提供 SaaS 服务和技术支持。\n\n联系人 13812345678。\n\n违约责任由双方另行协商。",
    "utf8",
  );
  const { tools, state } = createContractTools({ contractRoot: root, maxChunkChars: 45 });
  const readTool = tools.find((tool) => tool.name === "read_contract");
  assert.ok(readTool);

  const readResult = await readTool.execute("call-1", { path: file });

  assert.equal(state.classification?.type, "software_service");
  assert.ok(state.chunks.length >= 2);
  assert.equal("text" in (readResult.details as object), false);

  const chunkTool = tools.find((tool) => tool.name === "get_contract_chunk");
  assert.ok(chunkTool);
  const chunkResult = await chunkTool.execute("call-2", { chunkId: state.chunks.at(-1)?.id ?? "" });
  const chunkText = chunkResult.content.map((item) => (item.type === "text" ? item.text : "")).join("");
  assert.doesNotMatch(chunkText, /13812345678/);
});

test("review skill and submit tool produce a structured final report", async () => {
  const root = await mkdtemp(join(tmpdir(), "contract-tools-"));
  const { tools, state } = createContractTools({ contractRoot: root });
  const skillTool = tools.find((tool) => tool.name === "load_review_skill");
  assert.ok(skillTool);
  const skill = await skillTool.execute("call-1", {});
  assert.match(skill.content[0]?.type === "text" ? skill.content[0].text : "", /违约责任/);

  const submitTool = tools.find((tool) => tool.name === "submit_contract_review");
  assert.ok(submitTool);
  const report = {
    contractType: "software_service",
    summary: "风险集中在违约责任。",
    overallRisk: "high",
    findings: [
      {
        clause: "违约责任",
        risk: "high",
        issue: "责任不明确",
        rationale: "无法确定救济范围",
        recommendation: "补充责任上限和计算方法",
        evidence: "另行协商",
      },
    ],
    missingClauses: ["知识产权"],
    disclaimer: "仅供内部审查参考，不构成法律意见。",
  } as const;

  const result = await submitTool.execute("call-2", report);

  assert.equal(result.terminate, true);
  assert.deepEqual(state.report, report);
});
