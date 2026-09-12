import { loadLocalEnv } from "./env-loader.js";
import { createContractWebServer } from "./web/server.js";

loadLocalEnv();

const port = Number.parseInt(process.env.CONTRACT_AGENT_PORT ?? "3456", 10);
const server = createContractWebServer();
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`合同审查 ChatPanel：http://127.0.0.1:${port}\n`);
});
