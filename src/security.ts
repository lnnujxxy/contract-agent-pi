import { relative, resolve, sep } from "node:path";

export function assertPathInsideRoot(root: string, candidate: string): string {
  const absoluteRoot = resolve(root);
  const absoluteCandidate = resolve(candidate);
  const pathFromRoot = relative(absoluteRoot, absoluteCandidate);

  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || pathFromRoot.startsWith(sep)) {
    throw new Error(`Path is outside the allowed contract root: ${absoluteCandidate}`);
  }
  return absoluteCandidate;
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(/\b1[3-9]\d{9}\b/g, "[手机号已脱敏]")
    .replace(/\b\d{17}[\dXx]\b/g, "[身份证号已脱敏]")
    .replace(/\b\d{16,19}\b/g, "[银行卡号已脱敏]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[邮箱已脱敏]");
}
