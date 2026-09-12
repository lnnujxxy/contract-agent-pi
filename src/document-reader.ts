import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import type { ContractDocument } from "./domain.js";
import { assertPathInsideRoot } from "./security.js";

const SUPPORTED_FORMATS = new Set(["txt", "md", "pdf", "docx"]);

async function extractText(buffer: Buffer, format: ContractDocument["format"]): Promise<string> {
  if (format === "txt" || format === "md") return buffer.toString("utf8");
  if (format === "docx") return (await mammoth.extractRawText({ buffer })).value;

  const parser = new PDFParse({ data: buffer });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}

export async function readContractDocument(filePath: string, allowedRoot: string): Promise<ContractDocument> {
  const safePath = assertPathInsideRoot(allowedRoot, filePath);
  const format = extname(safePath).slice(1).toLocaleLowerCase();
  if (!SUPPORTED_FORMATS.has(format)) {
    throw new Error(`Unsupported contract format: .${format || "unknown"}`);
  }

  const buffer = await readFile(safePath);
  const text = (await extractText(buffer, format as ContractDocument["format"])).trim();
  if (!text) throw new Error("Contract document contains no extractable text");

  return {
    path: safePath,
    fileName: basename(safePath),
    format: format as ContractDocument["format"],
    text,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    charCount: text.length,
  };
}
