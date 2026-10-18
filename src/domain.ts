export const CONTRACT_TYPES = [
  "software_service",
  "procurement",
  "employment",
  "lease",
  "confidentiality",
  "sales",
  "unknown",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export interface ContractClassification {
  type: ContractType;
  confidence: number;
  evidence: string[];
}

export interface ContractChunk {
  id: string;
  index: number;
  text: string;
  startChar: number;
  endChar: number;
}

export const CONTRACT_FORMATS = ["txt", "md", "pdf", "docx"] as const;

export type ContractFormat = (typeof CONTRACT_FORMATS)[number];

export function isContractFormat(value: string): value is ContractFormat {
  return (CONTRACT_FORMATS as readonly string[]).includes(value);
}

export interface ContractDocument {
  path: string;
  fileName: string;
  format: ContractFormat;
  text: string;
  sha256: string;
  charCount: number;
}

export const RISK_LEVELS = ["critical", "high", "medium", "low"] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

export interface ReviewFinding {
  clause: string;
  risk: RiskLevel;
  issue: string;
  rationale: string;
  recommendation: string;
  evidence: string;
}

export interface ReviewReport {
  contractType: ContractType;
  summary: string;
  overallRisk: RiskLevel;
  findings: ReviewFinding[];
  missingClauses: string[];
  disclaimer: string;
}
