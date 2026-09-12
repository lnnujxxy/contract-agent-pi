import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadEnvFile } from "node:process";

export function findLocalEnvFile(cwd = process.cwd(), home = homedir()): string | undefined {
  const projectEnv = join(cwd, ".env");
  if (existsSync(projectEnv)) return projectEnv;
  const codexEnv = join(home, ".codex", ".env");
  return existsSync(codexEnv) ? codexEnv : undefined;
}

export function loadLocalEnv(): string | undefined {
  const file = findLocalEnvFile();
  if (file) loadEnvFile(file);
  return file;
}
