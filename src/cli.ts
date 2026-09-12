import { parseCliOptions } from "./cli-options.js";
import { loadLocalEnv } from "./env-loader.js";
import { runReview } from "./run-review.js";
import { formatAgentEvent } from "./ui-events.js";

loadLocalEnv();

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const result = await runReview({
    ...options,
    onEvent(event) {
      const formatted = formatAgentEvent(event);
      if (!formatted) return;
      if (formatted.kind === "text") process.stdout.write(formatted.text);
      else process.stdout.write(`\n${formatted.text}\n`);
    },
  });
  process.stdout.write(`\nJSON: ${result.jsonPath}\nMarkdown: ${result.markdownPath}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
