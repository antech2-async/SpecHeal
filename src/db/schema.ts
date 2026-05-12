import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const runStatus = pgEnum("run_status", [
  "pending",
  "running",
  "completed",
  "failed"
]);

export const runVerdict = pgEnum("run_verdict", [
  "NO_HEAL_NEEDED",
  "HEAL",
  "PRODUCT BUG",
  "SPEC OUTDATED",
  "RUN_ERROR"
]);

export const jiraPublishStatus = pgEnum("jira_publish_status", [
  "not_required",
  "pending",
  "published",
  "jira_publish_failed"
]);

export const spechealRuns = pgTable("specheal_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id").notNull().default("shopflow-checkout"),
  scenarioId: text("scenario_id").notNull(),
  scenarioState: text("scenario_state").notNull(),
  status: runStatus("status").notNull().default("pending"),
  verdict: runVerdict("verdict"),
  reason: text("reason"),
  confidence: real("confidence"),
  failedStage: text("failed_stage"),
  errorMessage: text("error_message"),
  targetUrl: text("target_url"),
  baselineSelector: text("baseline_selector"),
  candidateSelector: text("candidate_selector"),
  testFilePath: text("test_file_path"),
  openSpecPath: text("open_spec_path"),
  openSpecClause: text("open_spec_clause"),
  report: jsonb("report").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const runEvidence = pgTable("run_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => spechealRuns.id, { onDelete: "cascade" }),
  playwrightError: text("playwright_error"),
  screenshotBase64: text("screenshot_base64"),
  failedSelector: text("failed_selector"),
  targetUrl: text("target_url"),
  rawDomLength: integer("raw_dom_length"),
  cleanedDomLength: integer("cleaned_dom_length"),
  cleanedDom: text("cleaned_dom"),
  visibleEvidence: jsonb("visible_evidence").$type<Record<string, unknown>>(),
  candidates: jsonb("candidates").$type<Record<string, unknown>[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const aiTraces = pgTable("ai_traces", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => spechealRuns.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  userPrompt: text("user_prompt").notNull(),
  rawResponse: text("raw_response"),
  parsedResponse: jsonb("parsed_response").$type<Record<string, unknown>>(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  estimatedCostUsd: real("estimated_cost_usd"),
  durationMs: integer("duration_ms"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const validationResults = pgTable("validation_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => spechealRuns.id, { onDelete: "cascade" }),
  selector: text("selector").notNull(),
  passed: boolean("passed").notNull(),
  elementCount: integer("element_count").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const patchPreviews = pgTable("patch_previews", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => spechealRuns.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  oldLine: text("old_line").notNull(),
  newLine: text("new_line").notNull(),
  appliedDiff: text("applied_diff"),
  explanation: text("explanation"),
  applied: boolean("applied").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const rerunResults = pgTable("rerun_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => spechealRuns.id, { onDelete: "cascade" }),
  testFilePath: text("test_file_path").notNull(),
  selector: text("selector").notNull(),
  passed: boolean("passed").notNull(),
  expectedText: text("expected_text").notNull(),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const jiraPublishResults = pgTable("jira_publish_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => spechealRuns.id, { onDelete: "cascade" }),
  status: jiraPublishStatus("status").notNull().default("pending"),
  issueType: text("issue_type"),
  issueKey: text("issue_key"),
  issueUrl: text("issue_url"),
  issueId: text("issue_id"),
  payloadSummary: text("payload_summary"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export type SpecHealRun = typeof spechealRuns.$inferSelect;
export type NewSpecHealRun = typeof spechealRuns.$inferInsert;
