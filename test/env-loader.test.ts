import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { findLocalEnvFile } from "../src/env-loader.js";

test("prefers project .env and falls back to ~/.codex/.env", async () => {
  const root = await mkdtemp(join(tmpdir(), "contract-env-"));
  const project = join(root, "project");
  const home = join(root, "home");
  await mkdir(join(home, ".codex"), { recursive: true });
  await mkdir(project, { recursive: true });
  await writeFile(join(home, ".codex", ".env"), "TOKEN=home", "utf8");

  assert.equal(findLocalEnvFile(project, home), join(home, ".codex", ".env"));
  await writeFile(join(project, ".env"), "TOKEN=project", "utf8");
  assert.equal(findLocalEnvFile(project, home), join(project, ".env"));
});
