import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().trim().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().trim().default("gpt-4o-mini"),
  NEXT_PUBLIC_BASE_URL: z.string().trim().url().default("http://localhost:3000"),
  PLAYWRIGHT_HEADLESS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  JIRA_SITE_URL: z.string().trim().url("JIRA_SITE_URL must be a URL"),
  JIRA_USER_EMAIL: z.string().trim().email("JIRA_USER_EMAIL must be an email"),
  JIRA_API_TOKEN: z.string().trim().min(1, "JIRA_API_TOKEN is required"),
  JIRA_PROJECT_KEY: z.string().trim().default("SH"),
  JIRA_TASK_ISSUE_TYPE: z.string().trim().default("Task"),
  JIRA_BUG_ISSUE_TYPE: z.string().trim().default("Bug")
});

export const databaseEnvSchema = serverEnvSchema.pick({
  DATABASE_URL: true
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

export function readServerEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env);
}

export function readDatabaseEnv(): DatabaseEnv {
  return databaseEnvSchema.parse(process.env);
}

export function getAppBaseUrl() {
  return (
    optionalUrl.parse(process.env.NEXT_PUBLIC_BASE_URL) ?? "http://localhost:3000"
  );
}

export function getRuntimeReadiness() {
  const env = process.env;

  return [
    {
      name: "OpenAI",
      ready: Boolean(optionalText.parse(env.OPENAI_API_KEY)),
      message: env.OPENAI_API_KEY
        ? `Model ${env.OPENAI_MODEL || "gpt-4o-mini"} configured.`
        : "Missing OPENAI_API_KEY."
    },
    {
      name: "PostgreSQL",
      ready: Boolean(optionalText.parse(env.DATABASE_URL)),
      message: env.DATABASE_URL ? "DATABASE_URL configured." : "Missing DATABASE_URL."
    },
    {
      name: "Jira",
      ready: Boolean(
        optionalUrl.parse(env.JIRA_SITE_URL) &&
          optionalText.parse(env.JIRA_USER_EMAIL) &&
          optionalText.parse(env.JIRA_API_TOKEN) &&
          optionalText.parse(env.JIRA_PROJECT_KEY)
      ),
      message:
        env.JIRA_SITE_URL && env.JIRA_USER_EMAIL && env.JIRA_API_TOKEN
          ? `Project ${env.JIRA_PROJECT_KEY || "SH"} configured.`
          : "Missing Jira credentials or project key."
    },
    {
      name: "Playwright",
      ready: true,
      message: `Headless mode: ${env.PLAYWRIGHT_HEADLESS || "true"}.`
    }
  ];
}
