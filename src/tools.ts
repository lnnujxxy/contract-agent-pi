import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";

import { chunkContract } from "./chunking.js";
import { classifyContract } from "./classifier.js";
import type { ContractChunk, ContractClassification, ContractDocument, ReviewReport } from "./domain.js";
import { readContractDocument } from "./document-reader.js";
import { redactSensitiveText } from "./security.js";

export interface ContractToolState {
  document?: ContractDocument;
  classification?: ContractClassification;
  chunks: ContractChunk[];
  report?: ReviewReport;
}

export interface ContractToolOptions {
  contractRoot: string;
  maxChunkChars?: number;
  overlapChars?: number;
  skillPath?: string;
}

const RiskLevelSchema = Type.Union([
  Type.Literal("critical"),
  Type.Literal("high"),
  Type.Literal("medium"),
  Type.Literal("low"),
]);

const ContractTypeSchema = Type.Union([
  Type.Literal("software_service"),
  Type.Literal("procurement"),
  Type.Literal("employment"),
  Type.Literal("lease"),
  Type.Literal("confidentiality"),
  Type.Literal("sales"),
  Type.Literal("unknown"),
]);

const ReviewReportSchema = Type.Object({
  contractType: ContractTypeSchema,
  summary: Type.String({ minLength: 1 }),
  overallRisk: RiskLevelSchema,
  findings: Type.Array(
    Type.Object({
      clause: Type.String(),
      risk: RiskLevelSchema,
      issue: Type.String(),
      rationale: Type.String(),
      recommendation: Type.String(),
      evidence: Type.String(),
    }),
  ),
  missingClauses: Type.Array(Type.String()),
  disclaimer: Type.String(),
});

const ReadContractSchema = Type.Object({ path: Type.String({ description: "合同文件的绝对或相对路径" }) });
const GetChunkSchema = Type.Object({ chunkId: Type.String() });
const EmptySchema = Type.Object({});

export function createContractTools(options: ContractToolOptions): {
  tools: AgentTool[];
  state: ContractToolState;
} {
  const state: ContractToolState = { chunks: [] };
  const maxChunkChars = options.maxChunkChars ?? 8_000;
  const overlapChars = Math.min(options.overlapChars ?? 600, Math.max(0, maxChunkChars - 1));
  const skillPath = options.skillPath ?? join(process.cwd(), ".pi", "skills", "contract-risk-review", "SKILL.md");

  const readContractTool: AgentTool<typeof ReadContractSchema> = {
    name: "read_contract",
    label: "读取合同",
    description: "读取本地 TXT、Markdown、PDF 或 DOCX 合同，完成分类和分块。只允许读取配置目录内的文件。",
    parameters: ReadContractSchema,
    async execute(_toolCallId, params) {
      const document = await readContractDocument(params.path, options.contractRoot);
      const classification = classifyContract(document.text);
      const chunks = chunkContract(document.text, { maxChars: maxChunkChars, overlapChars });
      state.document = document;
      state.classification = classification;
      state.chunks = chunks;

      const details = {
        fileName: document.fileName,
        format: document.format,
        sha256: document.sha256,
        charCount: document.charCount,
        classification,
        chunkIds: chunks.map((chunk) => chunk.id),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(details, null, 2) }],
        details,
      };
    },
  };

  const getChunkTool: AgentTool<typeof GetChunkSchema> = {
    name: "get_contract_chunk",
    label: "读取合同分块",
    description: "按 chunkId 读取已加载合同的一个分块。敏感身份信息会在发送给模型前自动脱敏。",
    parameters: GetChunkSchema,
    async execute(_toolCallId, params) {
      const chunk = state.chunks.find((item) => item.id === params.chunkId);
      if (!chunk) throw new Error(`Unknown contract chunk: ${params.chunkId}`);
      const redactedText = redactSensitiveText(chunk.text);
      return {
        content: [{ type: "text", text: `${chunk.id}\n${redactedText}` }],
        details: { id: chunk.id, index: chunk.index, startChar: chunk.startChar, endChar: chunk.endChar },
      };
    },
  };

  const loadSkillTool: AgentTool<typeof EmptySchema> = {
    name: "load_review_skill",
    label: "加载合同审查方法",
    description: "加载标准合同审查清单和风险分级方法。开始审查前必须调用一次。",
    parameters: EmptySchema,
    async execute() {
      const referenceNames = [
        "risk-clauses.md",
        "contract-templates.md",
        "legal-regulations.md",
        "revision-suggestions.md",
      ];
      const [skill, ...references] = await Promise.all([
        readFile(skillPath, "utf8"),
        ...referenceNames.map((name) => readFile(join(dirname(skillPath), "references", name), "utf8")),
      ]);
      const text = [skill, ...references].join("\n\n---\n\n");
      return {
        content: [{ type: "text", text }],
        details: { skillPath, references: referenceNames },
      };
    },
  };

  const submitReviewTool: AgentTool<typeof ReviewReportSchema, ReviewReport> = {
    name: "submit_contract_review",
    label: "提交结构化审查报告",
    description: "完成全部分块审查后，提交最终结构化报告并结束本轮任务。",
    parameters: ReviewReportSchema,
    async execute(_toolCallId, params) {
      state.report = params;
      return {
        content: [{ type: "text", text: "合同审查报告已生成。" }],
        details: params,
        terminate: true,
      };
    },
  };

  return { tools: [readContractTool, getChunkTool, loadSkillTool, submitReviewTool], state };
}
