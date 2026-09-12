import assert from "node:assert/strict";
import test from "node:test";

import { formatReportMarkdown } from "../src/report.js";

test("formats a structured report as readable markdown", () => {
  const markdown = formatReportMarkdown({
    contractType: "procurement",
    summary: "付款和验收存在风险。",
    overallRisk: "high",
    findings: [
      {
        clause: "第 3 条",
        risk: "high",
        issue: "先款后货",
        rationale: "缺少履约保障",
        recommendation: "改为验收后付款",
        evidence: "签约后 3 日内支付全部价款",
      },
    ],
    missingClauses: ["质量保证"],
    disclaimer: "仅供内部审查参考，不构成法律意见。",
  });

  assert.match(markdown, /# 合同审查报告/);
  assert.match(markdown, /第 3 条/);
  assert.match(markdown, /质量保证/);
  assert.match(markdown, /不构成法律意见/);
});
