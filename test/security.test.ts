import assert from "node:assert/strict";
import test from "node:test";

import { assertPathInsideRoot, redactSensitiveText } from "../src/security.js";

test("redacts Chinese identity, phone, bank card and email data", () => {
  const redacted = redactSensitiveText(
    "联系人 13812345678，身份证 11010519491231002X，卡号 6222020202020202020，邮箱 legal@example.com",
  );

  assert.doesNotMatch(redacted, /13812345678/);
  assert.doesNotMatch(redacted, /11010519491231002X/);
  assert.doesNotMatch(redacted, /6222020202020202020/);
  assert.doesNotMatch(redacted, /legal@example\.com/);
  assert.match(redacted, /\[手机号已脱敏\]/);
});

test("rejects paths outside the configured contract root", () => {
  assert.throws(
    () => assertPathInsideRoot("/workspace/contracts", "/workspace/secrets/key.txt"),
    /outside the allowed contract root/i,
  );
});
