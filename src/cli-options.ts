export interface CliOptions {
  contractPath: string;
  provider: string;
  model: string;
  outputBase?: string;
}

const USAGE = "Usage: npm run review -- <contract.pdf|docx|txt|md> [--provider id] [--model id] [--output path]";

export function parseCliOptions(args: string[]): CliOptions {
  const contractPath = args[0];
  if (!contractPath || contractPath.startsWith("--")) throw new Error(USAGE);

  const inferredProvider =
    process.env.CONTRACT_AGENT_PROVIDER ??
    (process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY ? "anthropic" : "openai");
  const inferredModel =
    process.env.CONTRACT_AGENT_MODEL ??
    (inferredProvider === "anthropic"
      ? (process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? "claude-sonnet-4-6")
      : "gpt-5-mini");

  const options: CliOptions = {
    contractPath,
    provider: inferredProvider,
    model: inferredModel,
  };

  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !value) throw new Error(USAGE);
    if (flag === "--provider") options.provider = value;
    else if (flag === "--model") options.model = value;
    else if (flag === "--output") options.outputBase = value;
    else throw new Error(`Unknown option: ${flag}\n${USAGE}`);
  }

  return options;
}
