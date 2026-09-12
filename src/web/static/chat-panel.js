class ChatPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: grid; grid-template-rows: auto 1fr auto; min-height: 0; border: 1px solid #30363d; border-radius: 14px; overflow: hidden; background: rgba(13,17,23,.92); }
        header { padding: 18px; border-bottom: 1px solid #30363d; }
        h1 { margin: 0; font-size: 18px; } p { margin: 5px 0 0; color: #8b949e; font-size: 13px; }
        #messages { min-height: 0; overflow: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .message { padding: 10px 12px; border-radius: 10px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
        .user { background: #1f6f5f; align-self: flex-end; max-width: 85%; }
        .assistant { background: #161b22; border: 1px solid #30363d; }
        .status { color: #8b949e; font: 12px ui-monospace, monospace; padding: 3px 0; }
        form { border-top: 1px solid #30363d; padding: 12px; display: grid; gap: 9px; }
        textarea { resize: vertical; min-height: 58px; max-height: 160px; border: 1px solid #30363d; border-radius: 9px; padding: 10px; color: #e6edf3; background: #0d1117; font: inherit; }
        .row { display: flex; align-items: center; gap: 9px; }
        input[type=file] { min-width: 0; flex: 1; color: #8b949e; }
        button { border: 0; border-radius: 8px; padding: 9px 15px; background: #2ea043; color: white; font-weight: 650; cursor: pointer; }
        button:disabled { opacity: .5; cursor: wait; }
      </style>
      <header><h1>合同审查 Agent</h1><p>pi-mono · Skill · 安全拦截 · SSE</p></header>
      <section id="messages"><div class="message assistant">选择 PDF、DOCX、TXT 或 Markdown 合同，然后发送审查要求。</div></section>
      <form><textarea placeholder="例如：请从甲方视角审查这份合同"></textarea><div class="row"><input type="file" accept=".pdf,.docx,.txt,.md" /><button>开始审查</button></div></form>`;
  }

  connectedCallback() {
    this.shadowRoot.querySelector("form").addEventListener("submit", (event) => this.onSubmit(event));
  }

  addMessage(kind, text) {
    const element = document.createElement("div");
    element.className = kind === "status" ? "status" : `message ${kind}`;
    element.textContent = text;
    this.shadowRoot.getElementById("messages").append(element);
    element.scrollIntoView({ block: "end" });
    return element;
  }

  async onSubmit(event) {
    event.preventDefault();
    const textarea = this.shadowRoot.querySelector("textarea");
    const fileInput = this.shadowRoot.querySelector("input[type=file]");
    const button = this.shadowRoot.querySelector("button");
    const message = textarea.value.trim();
    const file = fileInput.files[0];
    if (!message || !file) return this.addMessage("status", "请选择合同并填写审查要求。");
    if (!confirm("Agent 将在本机上传目录读取该合同，并把脱敏后的合同分块发送给已配置的模型服务。允许继续吗？")) return;
    button.disabled = true;
    this.addMessage("user", message);
    const assistant = this.addMessage("assistant", "");
    try {
      const upload = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, { method: "POST", body: file });
      if (!upload.ok) throw new Error((await upload.json()).error || "上传失败");
      const { filePath } = await upload.json();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, filePath }),
      });
      if (!response.ok || !response.body) throw new Error("审查服务不可用");
      await this.consumeSse(response.body, assistant);
    } catch (error) {
      this.addMessage("status", `失败：${error.message}`);
    } finally {
      button.disabled = false;
    }
  }

  async consumeSse(body, assistant) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const packets = buffer.split("\n\n");
      buffer = packets.pop() || "";
      for (const packet of packets) {
        const line = packet.split("\n").find((item) => item.startsWith("data:"));
        if (!line) continue;
        this.handlePacket(JSON.parse(line.slice(5).trim()), assistant);
      }
    }
  }

  handlePacket(packet, assistant) {
    if (packet.event === "message_delta") assistant.textContent += packet.data.delta;
    else if (packet.event === "tool_start") this.addMessage("status", `▶ ${packet.data.toolName}`);
    else if (packet.event === "tool_end") this.addMessage("status", `${packet.data.isError ? "✗" : "✓"} ${packet.data.toolName}`);
    else if (packet.event === "status") this.addMessage("status", packet.data.text);
    else if (packet.event === "error") this.addMessage("status", `失败：${packet.data.message}`);
    else if (packet.event === "report") {
      this.addMessage("status", "报告已生成并在右侧打开。");
      this.dispatchEvent(new CustomEvent("artifact-ready", { detail: packet.data, bubbles: true }));
    }
  }
}

class ArtifactSandbox extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<iframe sandbox title="合同审查报告"></iframe>`;
    document.addEventListener("artifact-ready", (event) => {
      this.querySelector("iframe").src = event.detail.markdownUrl;
    });
  }
}

customElements.define("chat-panel", ChatPanel);
customElements.define("artifact-sandbox", ArtifactSandbox);
