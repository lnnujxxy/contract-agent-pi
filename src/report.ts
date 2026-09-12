import type { ReviewReport } from "./domain.js";

function safeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

export function formatReportMarkdown(report: ReviewReport): string {
  const findings = report.findings.length
    ? [
        "| 条款 | 风险 | 问题 | 原因 | 修改建议 | 证据 |",
        "| --- | --- | --- | --- | --- | --- |",
        ...report.findings.map((finding) =>
          [
            finding.clause,
            finding.risk,
            finding.issue,
            finding.rationale,
            finding.recommendation,
            finding.evidence,
          ]
            .map(safeCell)
            .join(" | ")
            .replace(/^/, "| ")
            .replace(/$/, " |"),
        ),
      ].join("\n")
    : "未发现需要报告的风险项。";
  const missing = report.missingClauses.length
    ? report.missingClauses.map((clause) => `- ${clause}`).join("\n")
    : "- 无";

  return `# 合同审查报告

- 合同类型：${report.contractType}
- 整体风险：${report.overallRisk}

## 摘要

${report.summary}

## 风险项

${findings}

## 缺失条款

${missing}

## 免责声明

${report.disclaimer}
`;
}
