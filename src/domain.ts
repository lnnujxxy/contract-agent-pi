export type ContractType =
  | "software_service"
  | "procurement"
  | "employment"
  | "lease"
  | "confidentiality"
  | "sales"
  | "unknown";

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

export interface ContractDocument {
  path: string;
  fileName: string;
  format: "txt" | "md" | "pdf" | "docx";
  text: string;
  sha256: string;
  charCount: number;
}

export type RiskLevel = "critical" | "high" | "medium" | "low";

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
