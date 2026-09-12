import { ProcessTerminal, Text, TuiMainScreen, VStack } from "@earendil-works/pi-tui";

import { parseCliOptions } from "./cli-options.js";
import { loadLocalEnv } from "./env-loader.js";
import { runReview } from "./run-review.js";
import { formatAgentEvent } from "./ui-events.js";

loadLocalEnv();

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const terminal = new ProcessTerminal();
  const tui = new TuiMainScreen(terminal);
  const header = new Text("合同审查 Agent · pi-mono", 1, 1);
  const status = new Text("准备读取合同…", 1, 0);
  const output = new Text("", 1, 1);
  tui.addChild(new VStack([header, status, output]));
  tui.start();

  let streamedText = "";
  try {
    const result = await runReview({
      ...options,
      onEvent(event) {
        const formatted = formatAgentEvent(event);
        if (!formatted) return;
        if (formatted.kind === "text") {
          streamedText += formatted.text;
          output.setText(streamedText.slice(-12_000));
        } else {
          status.setText(formatted.text);
        }
        tui.requestRender();
      },
    });
    status.setText(`完成 · ${result.markdownPath}`);
    tui.requestRender(true);
  } catch (error) {
    status.setText(`失败 · ${error instanceof Error ? error.message : String(error)}`);
    tui.requestRender(true);
    process.exitCode = 1;
  } finally {
    tui.stop({ preserveScreen: true });
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
