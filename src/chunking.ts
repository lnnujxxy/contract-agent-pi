import type { ContractChunk } from "./domain.js";

export interface ChunkOptions {
  maxChars: number;
  overlapChars: number;
}

function splitOversizedParagraph(paragraph: string, maxChars: number): string[] {
  const parts: string[] = [];
  for (let offset = 0; offset < paragraph.length; offset += maxChars) {
    parts.push(paragraph.slice(offset, offset + maxChars));
  }
  return parts;
}

export function chunkContract(text: string, options: ChunkOptions): ContractChunk[] {
  if (options.maxChars <= 0) throw new Error("maxChars must be positive");
  if (options.overlapChars < 0 || options.overlapChars >= options.maxChars) {
    throw new Error("overlapChars must be non-negative and smaller than maxChars");
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n(?=(?:第[一二三四五六七八九十百千万\d]+[章节条]|\d+(?:\.\d+)*[.、．]\s*))/)
    .flatMap((section) => section.split(/\n{2,}/))
    .flatMap((paragraph) => splitOversizedParagraph(paragraph.trim(), options.maxChars));
  const rawChunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= options.maxChars) {
      current = candidate;
      continue;
    }
    if (current) rawChunks.push(current);
    const overlap = options.overlapChars === 0 ? "" : current.slice(-options.overlapChars);
    current = overlap ? `${overlap}\n${paragraph}` : paragraph;
  }
  if (current) rawChunks.push(current);

  let searchFrom = 0;
  return rawChunks.map((chunk, index) => {
    const uniquePart = index === 0 ? chunk : chunk.slice(Math.min(options.overlapChars, chunk.length));
    const locatedAt = normalized.indexOf(uniquePart.trimStart(), searchFrom);
    const startChar = locatedAt >= 0 ? Math.max(0, locatedAt - (chunk.length - uniquePart.length)) : searchFrom;
    const endChar = Math.min(normalized.length, startChar + chunk.length);
    searchFrom = Math.max(searchFrom, endChar - options.overlapChars);
    return { id: `chunk-${index + 1}`, index, text: chunk, startChar, endChar };
  });
}
