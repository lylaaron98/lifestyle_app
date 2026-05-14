import OpenAI from "openai";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // Ignore missing local env files; the process can still use real env vars.
  }
}

function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return undefined;
}

const apiKey = readEnv("OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY");
const baseURL = readEnv("OPENAI_BASE_URL", "AI_INTEGRATIONS_OPENAI_BASE_URL") ?? "https://api.openai.com/v1";

if (!apiKey) {
  throw new Error(
    "Set OPENAI_API_KEY in artifacts/api-server/.env to use your own key (AI_INTEGRATIONS_OPENAI_API_KEY is still supported for Replit).",
  );
}

export const openai = new OpenAI({
  apiKey,
  baseURL,
});
