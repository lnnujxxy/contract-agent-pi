const reviewInstructionBrand = Symbol("ReviewInstruction");

/** Review text that has already passed the length and emptiness boundary. */
export interface ReviewInstruction {
  readonly text: string;
  readonly [reviewInstructionBrand]: true;
}

export const MAX_REVIEW_INSTRUCTION_CHARS = 4_000;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function seal(text: string): ReviewInstruction {
  return { text, [reviewInstructionBrand]: true };
}

export function parseReviewInstruction(input: unknown): ReviewInstruction {
  if (typeof input !== "string") throw new Error("Review instruction is required");
  const text = input.trim().replace(CONTROL_CHARS, "");
  if (!text) throw new Error("Review instruction is required");
  if (text.length > MAX_REVIEW_INSTRUCTION_CHARS) {
    throw new Error(`Review instruction exceeds ${MAX_REVIEW_INSTRUCTION_CHARS} characters`);
  }
  return seal(text);
}

/** CLI and TUI have no separate user message. */
export function defaultReviewInstruction(): ReviewInstruction {
  return seal("");
}
