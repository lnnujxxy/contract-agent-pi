import { readFile } from "node:fs/promises";
import { join } from "node:path";

const CONTRACT_PATH_PLACEHOLDER = "{{contractPath}}";

export interface ReviewPrompts {
  systemPrompt: string;
  taskPrompt: string;
}

export function reviewPromptDirectory(cwd = process.cwd()): string {
  return join(cwd, ".pi", "skills", "contract-risk-review");
}

export async function loadReviewPrompts(promptDir: string, contractPath: string): Promise<ReviewPrompts> {
  const systemPrompt = await readPromptFile(join(promptDir, "system.md"));
  const taskTemplate = await readPromptFile(join(promptDir, "task.md"));
  if (!taskTemplate.includes(CONTRACT_PATH_PLACEHOLDER)) {
    throw new Error(`Review task prompt is missing ${CONTRACT_PATH_PLACEHOLDER}`);
  }
  return {
    systemPrompt,
    taskPrompt: taskTemplate.replaceAll(CONTRACT_PATH_PLACEHOLDER, contractPath),
  };
}

async function readPromptFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFile(error)) throw new Error(`Missing review prompt file: ${path}`);
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
