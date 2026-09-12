import type { ContractClassification, ContractType } from "./domain.js";

interface Rule {
  type: Exclude<ContractType, "unknown">;
  keywords: string[];
}

const RULES: Rule[] = [
  { type: "software_service", keywords: ["SaaS", "软件", "源代码", "系统维护", "技术支持", "服务级别"] },
  { type: "procurement", keywords: ["采购", "供货", "设备", "验收", "交付货物"] },
  { type: "employment", keywords: ["劳动合同", "用人单位", "试用期", "工资", "社会保险"] },
  { type: "lease", keywords: ["租赁", "出租方", "承租方", "租金", "押金"] },
  { type: "confidentiality", keywords: ["保密协议", "保密信息", "披露方", "接收方", "商业秘密"] },
  { type: "sales", keywords: ["销售合同", "买方", "卖方", "货款", "所有权转移"] },
];

export function classifyContract(text: string): ContractClassification {
  const matches = RULES.map((rule) => ({
    ...rule,
    evidence: rule.keywords.filter((keyword) => text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())),
  })).sort((a, b) => b.evidence.length - a.evidence.length);

  const best = matches[0];
  if (!best || best.evidence.length < 2) {
    return { type: "unknown", confidence: 0.2, evidence: [] };
  }

  return {
    type: best.type,
    confidence: Math.min(0.98, 0.55 + best.evidence.length * 0.1),
    evidence: best.evidence,
  };
}
