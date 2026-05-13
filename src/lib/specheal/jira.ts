import { jiraPublishResults, type SpecHealRun } from "@/db/schema";
import { getAppBaseUrl, readJiraEnv } from "@/lib/env";
import { normalizeRunReport } from "./run-report";
import {
  createJiraPublishResult,
  findRecoveryRun,
  getLatestJiraPublishResult
} from "./runs";

type JiraIssueType = "Task" | "Bug";
type JiraPublishMode = "auto" | "retry";

type AdfNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
};

type AdfDoc = {
  type: "doc";
  version: 1;
  content: AdfNode[];
};

type JiraCreateIssueResponse = {
  id?: string;
  key?: string;
  self?: string;
};

export async function publishRunToJira(
  runId: string,
  mode: JiraPublishMode = "auto"
) {
  const run = await findRun(runId);

  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  const prior = await latestJiraResult(runId);

  if (prior?.issueKey || prior?.status === "not_required") {
    return prior;
  }

  const issueType = getIssueType(run);

  if (!issueType) {
    return createJiraResult({
      runId,
      status: "not_required",
      payloadSummary: `NO_HEAL_NEEDED run persisted as audit report only (${mode}).`
    });
  }

  const payload = buildJiraPayload(run, issueType);
  let env: ReturnType<typeof readJiraEnv>;

  try {
    env = readJiraEnv();
  } catch (error) {
    return createJiraResult({
      runId,
      status: "jira_publish_failed",
      issueType,
      payloadSummary: payload.fields.summary,
      payload,
      errorCode: "JIRA_NOT_CONFIGURED",
      errorMessage:
        error instanceof Error && error.name === "ZodError"
          ? "Jira is not configured. Set JIRA_SITE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY before publishing issues."
          : error instanceof Error
            ? error.message
            : "Jira is not configured."
    });
  }

  try {
    const response = await createJiraIssue(env, payload);
    const issueUrl = response.key
      ? `${env.JIRA_SITE_URL.replace(/\/$/, "")}/browse/${response.key}`
      : undefined;

    return createJiraResult({
      runId,
      status: "published",
      issueType,
      issueKey: response.key,
      issueId: response.id,
      issueUrl,
      payloadSummary: payload.fields.summary,
      payload
    });
  } catch (error) {
    return createJiraResult({
      runId,
      status: "jira_publish_failed",
      issueType,
      payloadSummary: payload.fields.summary,
      payload,
      errorCode: "JIRA_CREATE_FAILED",
      errorMessage: error instanceof Error ? error.message : "Jira publish failed."
    });
  }
}

function getIssueType(run: SpecHealRun): JiraIssueType | null {
  if (run.verdict === "NO_HEAL_NEEDED") {
    return null;
  }

  if (run.verdict === "PRODUCT BUG") {
    return "Bug";
  }

  return "Task";
}

function buildJiraPayload(run: SpecHealRun, issueType: JiraIssueType) {
  const report = normalizeRunReport(run.report);
  const output = report.output ?? {
    title: "Investigate SpecHeal recovery run",
    summary: run.reason || "SpecHeal produced an actionable recovery result.",
    recommendedAction: "Open the SpecHeal report and review the stored evidence.",
    evidence: [
      run.failedStage ? `Failed stage: ${run.failedStage}` : "",
      run.errorMessage ? `Error: ${run.errorMessage}` : ""
    ].filter(Boolean),
    safetyNote: "Review this result before applying any code or test changes."
  };
  const terminalResult = run.verdict || (run.status === "failed" ? "RUN_ERROR" : "UNKNOWN");
  const reportUrl = `${getAppBaseUrl().replace(/\/$/, "")}/runs/${run.id}`;

  return {
    fields: {
      project: {
        key: process.env.JIRA_PROJECT_KEY || "SH"
      },
      issuetype: {
        name:
          issueType === "Bug"
            ? process.env.JIRA_BUG_ISSUE_TYPE || "Bug"
            : process.env.JIRA_TASK_ISSUE_TYPE || "Task"
      },
      summary: `[SpecHeal] ${output.title}`,
      description: buildAdfDescription({
        run,
        reportUrl,
        terminalResult,
        summary: output.summary,
        recommendedAction: output.recommendedAction,
        evidence: output.evidence,
        safetyNote: output.safetyNote,
        patchDiff: report.patch?.appliedDiff,
        candidateSelector: run.candidateSelector,
        validation: report.validation,
        rerun: report.rerun
      }),
      labels: [
        "specheal",
        "ai-recovery",
        "playwright",
        labelFor(run.scenarioId),
        labelFor(terminalResult)
      ]
    }
  };
}

async function createJiraIssue(
  env: ReturnType<typeof readJiraEnv>,
  payload: ReturnType<typeof buildJiraPayload>
): Promise<JiraCreateIssueResponse> {
  const response = await fetch(
    `${env.JIRA_SITE_URL.replace(/\/$/, "")}/rest/api/3/issue`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${env.JIRA_USER_EMAIL}:${env.JIRA_API_TOKEN}`
        ).toString("base64")}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jira create issue failed (${response.status}): ${body}`);
  }

  return (await response.json()) as JiraCreateIssueResponse;
}

function buildAdfDescription(options: {
  run: SpecHealRun;
  reportUrl: string;
  terminalResult: string;
  summary: string;
  recommendedAction: string;
  evidence: string[];
  safetyNote: string;
  patchDiff?: string;
  candidateSelector?: string | null;
  validation?: {
    selector: string;
    passed: boolean;
    elementCount: number;
    reason?: string;
  };
  rerun?: {
    testFilePath: string;
    selector: string;
    passed: boolean;
    expectedText: string;
    durationMs?: number;
    errorMessage?: string;
  };
}): AdfDoc {
  const content: AdfNode[] = [
    heading("SpecHeal recovery result", 2),
    paragraph(`Run ID: ${options.run.id}`),
    paragraph(`Scenario: ${options.run.scenarioId}`),
    paragraph(`Terminal result: ${options.terminalResult}`),
    paragraph(`Report: ${options.reportUrl}`),
    heading("Summary", 3),
    paragraph(options.summary),
    heading("Recommended action", 3),
    paragraph(options.recommendedAction),
    heading("Evidence", 3),
    bulletList(options.evidence.length ? options.evidence : ["No evidence summary was generated."]),
    heading("Safety note", 3),
    paragraph(options.safetyNote)
  ];

  if (options.candidateSelector) {
    content.push(heading("Candidate selector", 3));
    content.push(codeBlock(options.candidateSelector));
  }

  if (options.validation) {
    content.push(heading("Validation", 3));
    content.push(
      bulletList([
        `Passed: ${options.validation.passed}`,
        `Element count: ${options.validation.elementCount}`,
        `Reason: ${options.validation.reason || "n/a"}`
      ])
    );
  }

  if (options.rerun) {
    content.push(heading("Rerun proof", 3));
    content.push(
      bulletList([
        `Passed: ${options.rerun.passed}`,
        `Test file: ${options.rerun.testFilePath}`,
        `Expected text: ${options.rerun.expectedText}`
      ])
    );
  }

  if (options.patchDiff) {
    content.push(heading("Applied patch preview", 3));
    content.push(codeBlock(options.patchDiff));
  }

  return {
    type: "doc",
    version: 1,
    content
  };
}

async function findRun(runId: string) {
  return findRecoveryRun(runId);
}

async function latestJiraResult(runId: string) {
  return getLatestJiraPublishResult(runId);
}

async function createJiraResult(
  values: typeof jiraPublishResults.$inferInsert
) {
  return createJiraPublishResult(values);
}

function heading(text: string, level: number): AdfNode {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }]
  };
}

function paragraph(text: string): AdfNode {
  return {
    type: "paragraph",
    content: [{ type: "text", text }]
  };
}

function bulletList(items: string[]): AdfNode {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)]
    }))
  };
}

function codeBlock(text: string): AdfNode {
  return {
    type: "codeBlock",
    attrs: { language: "text" },
    content: [{ type: "text", text }]
  };
}

function labelFor(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
