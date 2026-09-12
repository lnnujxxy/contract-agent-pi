# Contract Agent with pi-mono

本地运行的合同审查 Agent。它使用 pi-mono 的统一模型层、Agent Runtime、工具调用、事件流和 TUI，并把合同读取限制在指定目录内。

## 课程主线到本项目的映射

| 讲次 | 课程主题 | 本项目实现 |
| --- | --- | --- |
| 15 | 最小 Agent Runtime | `src/runtime.ts`：`Agent` + `pi-ai` 模型层 + 事件订阅 |
| 16 | 工具接口与结构化输出 | `src/tools.ts`：文档读取、分类、分块、结构化报告工具 |
| 17 | 长上下文与 Skill | `src/chunking.ts` + `.pi/skills/contract-risk-review/` |
| 18 | 多层安全护栏 | 路径白名单、PII 脱敏、`beforeToolCall` / `afterToolCall` 拦截 |
| 19 | ChatPanel / Web 接入 | 原生 Web Component、文件上传、SSE、权限预检和沙盒报告 |
| 20 | pi-tui | `src/tui.ts`：工具进度与模型事件流的差分渲染 |

## 架构

```text
CLI / pi-tui
     │ Agent events
     ▼
pi-agent-core Agent
     │
     ├─ load_review_skill
     ├─ read_contract ── PDF / DOCX / TXT / Markdown
     ├─ get_contract_chunk ── PII redaction
     └─ submit_contract_review ── typed JSON report
     │
     ▼
pi-ai provider/model
```

合同原文留在本机。发送给模型的分块会对手机号、身份证号、银行卡号和邮箱进行脱敏。注意：如果使用云模型，脱敏后的合同文本仍会发送给所选模型提供商；高敏合同应改接企业网关或本地模型。

## 启动

要求 Node.js 22.19 或更高版本。

```bash
cd /Users/admin/workspace/aiworkspace/contract-agent-pi
npm install
cp .env.example .env
```

程序优先读取项目 `.env`；如果不存在，会读取 `~/.codex/.env`。在其中配置模型和对应 API Key，例如：

```dotenv
CONTRACT_AGENT_PROVIDER=openai
CONTRACT_AGENT_MODEL=gpt-5-mini
OPENAI_API_KEY=your-key
```

单次命令行审查：

```bash
npm run review -- contracts/example-software-service.md
```

TUI：

```bash
npm run tui -- contracts/example-software-service.md
```

Web ChatPanel：

```bash
npm run web
# 打开 http://127.0.0.1:3456
```

Web 入口只监听本机地址。上传文件限制为 PDF、DOCX、TXT、Markdown，最大 20 MB；用户发送前会看到权限预检确认，服务端通过 SSE 推送文本增量和工具状态。

切换模型：

```bash
npm run review -- contracts/example-software-service.md \
  --provider deepseek \
  --model deepseek-v4-flash \
  --output reports/example
```

输出为 `reports/*-review.json` 和 `reports/*-review.md`。

## 验证

```bash
npm test
npm run check
npm run build
```

测试覆盖分类、分块、TXT 解析、工具链、结构化报告、路径越界阻断、敏感信息脱敏和 Runtime 装配。PDF/DOCX 解析使用真实库，但建议再用你们的真实合同样本做回归集。

## 当前边界

- 这是审查辅助工具，不构成法律意见。
- 分类器是可解释的关键词基线；最终判断由 Agent 结合原文完成。
- 当前没有 OCR，扫描版 PDF 需要先做 OCR。
- Web ChatPanel 是单用户本地原型；企业部署仍需补充 JWT、租户隔离、限流、队列、持久化和逐工具审批。
- 生产环境应增加租户隔离、密钥托管、审计落库、人工审批和模型网关 DLP。
