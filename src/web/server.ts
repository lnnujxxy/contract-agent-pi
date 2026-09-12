import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

import type { AgentEvent } from "@earendil-works/pi-agent-core";

import { parseCliOptions } from "../cli-options.js";
import { runReview, type RunReviewOptions } from "../run-review.js";
import { assertPathInsideRoot } from "../security.js";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"]);

export interface SsePacket {
  event: string;
  data: Record<string, unknown>;
}

export type ReviewRunner = (options: RunReviewOptions) => Promise<{ jsonPath: string; markdownPath: string }>;

export interface ContractWebServerOptions {
  reviewRunner?: ReviewRunner;
  workspaceRoot?: string;
}

export function sanitizeUploadName(input: string): string {
  const original = basename(input.normalize("NFKC"));
  const extension = extname(original).toLocaleLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) throw new Error(`Unsupported contract format: ${extension || "unknown"}`);
  const stem = basename(original, extension)
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}._-]/gu, "")
    .replace(/^-+|-+$/g, "");
  if (!stem) throw new Error("Upload filename is empty after sanitization");
  return `${stem}${extension}`;
}

export function mapAgentEventToSse(event: AgentEvent): SsePacket | undefined {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    return { event: "message_delta", data: { delta: event.assistantMessageEvent.delta } };
  }
  if (event.type === "tool_execution_start") {
    return { event: "tool_start", data: { toolName: event.toolName } };
  }
  if (event.type === "tool_execution_end") {
    return { event: "tool_end", data: { toolName: event.toolName, isError: event.isError } };
  }
  return undefined;
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

function sendSse(response: ServerResponse, packet: SsePacket): void {
  response.write(`data: ${JSON.stringify(packet)}\n\n`);
}

async function readBody(request: IncomingMessage, limit = MAX_UPLOAD_BYTES): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > limit) throw new Error(`Request exceeds ${limit} bytes`);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export function createContractWebServer(options: ContractWebServerOptions = {}) {
  const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd());
  const uploadsRoot = join(workspaceRoot, "uploads");
  const reportsRoot = join(workspaceRoot, "reports");
  const staticRoot = join(workspaceRoot, "src", "web", "static");
  const reviewRunner = options.reviewRunner ?? runReview;

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/chat-panel.js")) {
        const fileName = url.pathname === "/" ? "index.html" : "chat-panel.js";
        const content = await readFile(join(staticRoot, fileName));
        response.writeHead(200, {
          "content-type": fileName.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8",
          "cache-control": "no-store",
        });
        response.end(content);
        return;
      }

      if (request.method === "GET" && url.pathname.startsWith("/reports/")) {
        const reportPath = assertPathInsideRoot(reportsRoot, join(reportsRoot, basename(url.pathname)));
        const content = await readFile(reportPath);
        response.writeHead(200, { "content-type": "text/markdown; charset=utf-8", "x-content-type-options": "nosniff" });
        response.end(content);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/upload") {
        const fileName = sanitizeUploadName(url.searchParams.get("filename") ?? "");
        const body = await readBody(request);
        await mkdir(uploadsRoot, { recursive: true });
        const filePath = assertPathInsideRoot(uploadsRoot, join(uploadsRoot, fileName));
        await writeFile(filePath, body);
        sendJson(response, 201, { filePath });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/chat") {
        const body = JSON.parse((await readBody(request, 256 * 1024)).toString("utf8")) as {
          message?: unknown;
          filePath?: unknown;
        };
        if (typeof body.message !== "string" || typeof body.filePath !== "string") {
          sendJson(response, 400, { error: "message and filePath are required" });
          return;
        }
        const filePath = assertPathInsideRoot(uploadsRoot, body.filePath);
        const modelOptions = parseCliOptions([filePath]);
        response.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
          "x-content-type-options": "nosniff",
        });
        sendSse(response, { event: "status", data: { text: "合同已进入本地审查管道" } });
        const result = await reviewRunner({
          ...modelOptions,
          outputBase: join(reportsRoot, `web-review-${Date.now()}`),
          onEvent(event) {
            const packet = mapAgentEventToSse(event);
            if (packet && !response.destroyed) sendSse(response, packet);
          },
        });
        sendSse(response, {
          event: "report",
          data: { markdownUrl: `/reports/${basename(result.markdownPath)}` },
        });
        sendSse(response, { event: "done", data: {} });
        response.end();
        return;
      }

      sendJson(response, 404, { error: "not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (response.headersSent) {
        sendSse(response, { event: "error", data: { message } });
        sendSse(response, { event: "done", data: {} });
        response.end();
      } else {
        sendJson(response, /unsupported|outside|required|exceeds/i.test(message) ? 400 : 500, { error: message });
      }
    }
  });
}
