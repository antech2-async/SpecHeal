import type { SpecHealRun } from "@/db/schema";
import type { ShopFlowScenario } from "@/demo/shopflow";

export type TimelineStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type RunTimelineEvent = {
  key: string;
  title: string;
  status: TimelineStatus;
  detail: string;
  timestamp: string;
};

export type RunReport = {
  scenario: {
    id: ShopFlowScenario["id"];
    title: string;
    label: string;
    runtimeState: ShopFlowScenario["runtimeState"];
    summary: string;
  };
  target: {
    projectId: string;
    url: string;
    baselineSelector: string;
    testName: string;
    stepName: string;
  };
  openSpec: {
    path: string;
    clause: string;
  };
  playwright?: {
    passed: boolean;
    selectorUsed: string;
    targetUrl: string;
    testName: string;
    stepName: string;
    durationMs: number;
    errorMessage?: string;
  };
  evidence?: {
    failedSelector: string;
    targetUrl: string;
    screenshotBase64?: string;
    rawDomLength: number;
    cleanedDomLength: number;
    visibleText: string;
    candidateCount: number;
    candidates: Record<string, unknown>[];
  };
  ai?: {
    status: "skipped" | "completed" | "failed";
    model: string;
    verdict?: "HEAL" | "PRODUCT BUG" | "SPEC OUTDATED";
    reason?: string;
    confidence?: number;
    candidateSelector?: string | null;
    errorMessage?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    estimatedCostUsd?: number;
  };
  validation?: {
    selector: string;
    passed: boolean;
    elementCount: number;
    reason?: string;
  };
  patch?: {
    filePath: string;
    oldLine: string;
    newLine: string;
    appliedDiff: string;
    explanation: string;
    applied: boolean;
  };
  rerun?: {
    testFilePath: string;
    selector: string;
    passed: boolean;
    expectedText: string;
    durationMs?: number;
    errorMessage?: string;
  };
  output?: {
    kind: "safe_heal" | "product_bug" | "spec_outdated" | "operational_error";
    title: string;
    summary: string;
    recommendedAction: string;
    evidence: string[];
    safetyNote: string;
  };
  timeline: RunTimelineEvent[];
};

export function createInitialRunReport(
  scenario: ShopFlowScenario,
  targetUrl: string,
  openSpecPath: string,
  openSpecClause: string
): RunReport {
  return {
    scenario: {
      id: scenario.id,
      title: scenario.title,
      label: scenario.label,
      runtimeState: scenario.runtimeState,
      summary: scenario.summary
    },
    target: {
      projectId: "shopflow-checkout",
      url: targetUrl,
      baselineSelector: scenario.oldSelector,
      testName: scenario.testName,
      stepName: scenario.stepName
    },
    openSpec: {
      path: openSpecPath,
      clause: openSpecClause
    },
    timeline: [
      {
        key: "run-created",
        title: "Run created",
        status: "completed",
        detail: "SpecHeal created a persisted recovery run for the selected scenario.",
        timestamp: new Date().toISOString()
      },
      {
        key: "orchestration",
        title: "Recovery orchestration",
        status: "pending",
        detail: "The in-process runner is queued.",
        timestamp: new Date().toISOString()
      }
    ]
  };
}

export function appendTimelineEvent(
  report: Record<string, unknown> | null | undefined,
  event: RunTimelineEvent
): RunReport {
  const current = normalizeRunReport(report);
  return {
    ...current,
    timeline: [...current.timeline, event]
  };
}

export function normalizeRunReport(
  report: Record<string, unknown> | null | undefined
): RunReport {
  const fallback: RunReport = {
    scenario: {
      id: "healthy-flow",
      title: "Unknown scenario",
      label: "Unknown",
      runtimeState: "normal",
      summary: "The run report is still being assembled."
    },
    target: {
      projectId: "shopflow-checkout",
      url: "",
      baselineSelector: "",
      testName: "",
      stepName: ""
    },
    openSpec: {
      path: "",
      clause: ""
    },
    playwright: undefined,
    evidence: undefined,
    ai: undefined,
    validation: undefined,
    patch: undefined,
    rerun: undefined,
    output: undefined,
    timeline: []
  };

  if (!report) {
    return fallback;
  }

  return {
    ...fallback,
    ...report,
    scenario: {
      ...fallback.scenario,
      ...(isRecord(report.scenario) ? report.scenario : {})
    },
    target: {
      ...fallback.target,
      ...(isRecord(report.target) ? report.target : {})
    },
    openSpec: {
      ...fallback.openSpec,
      ...(isRecord(report.openSpec) ? report.openSpec : {})
    },
    playwright: isRecord(report.playwright)
      ? {
          passed: Boolean(report.playwright.passed),
          selectorUsed: String(report.playwright.selectorUsed ?? ""),
          targetUrl: String(report.playwright.targetUrl ?? ""),
          testName: String(report.playwright.testName ?? ""),
          stepName: String(report.playwright.stepName ?? ""),
          durationMs: Number(report.playwright.durationMs ?? 0),
          errorMessage:
            typeof report.playwright.errorMessage === "string"
              ? report.playwright.errorMessage
              : undefined
        }
      : undefined,
    evidence: isRecord(report.evidence)
      ? {
          failedSelector: String(report.evidence.failedSelector ?? ""),
          targetUrl: String(report.evidence.targetUrl ?? ""),
          screenshotBase64:
            typeof report.evidence.screenshotBase64 === "string"
              ? report.evidence.screenshotBase64
              : undefined,
          rawDomLength: Number(report.evidence.rawDomLength ?? 0),
          cleanedDomLength: Number(report.evidence.cleanedDomLength ?? 0),
          visibleText: String(report.evidence.visibleText ?? ""),
          candidateCount: Number(report.evidence.candidateCount ?? 0),
          candidates: Array.isArray(report.evidence.candidates)
            ? report.evidence.candidates.filter(isRecord)
            : []
        }
      : undefined,
    ai: isRecord(report.ai)
      ? {
          status:
            report.ai.status === "completed" ||
            report.ai.status === "failed" ||
            report.ai.status === "skipped"
              ? report.ai.status
              : "failed",
          model: String(report.ai.model ?? ""),
          verdict:
            report.ai.verdict === "HEAL" ||
            report.ai.verdict === "PRODUCT BUG" ||
            report.ai.verdict === "SPEC OUTDATED"
              ? report.ai.verdict
              : undefined,
          reason:
            typeof report.ai.reason === "string" ? report.ai.reason : undefined,
          confidence:
            typeof report.ai.confidence === "number"
              ? report.ai.confidence
              : undefined,
          candidateSelector:
            typeof report.ai.candidateSelector === "string"
              ? report.ai.candidateSelector
              : null,
          errorMessage:
            typeof report.ai.errorMessage === "string"
              ? report.ai.errorMessage
              : undefined,
          promptTokens:
            typeof report.ai.promptTokens === "number"
              ? report.ai.promptTokens
              : undefined,
          completionTokens:
            typeof report.ai.completionTokens === "number"
              ? report.ai.completionTokens
              : undefined,
          totalTokens:
            typeof report.ai.totalTokens === "number"
              ? report.ai.totalTokens
              : undefined,
          estimatedCostUsd:
            typeof report.ai.estimatedCostUsd === "number"
              ? report.ai.estimatedCostUsd
              : undefined
        }
      : undefined,
    validation: isRecord(report.validation)
      ? {
          selector: String(report.validation.selector ?? ""),
          passed: Boolean(report.validation.passed),
          elementCount: Number(report.validation.elementCount ?? 0),
          reason:
            typeof report.validation.reason === "string"
              ? report.validation.reason
              : undefined
        }
      : undefined,
    patch: isRecord(report.patch)
      ? {
          filePath: String(report.patch.filePath ?? ""),
          oldLine: String(report.patch.oldLine ?? ""),
          newLine: String(report.patch.newLine ?? ""),
          appliedDiff: String(report.patch.appliedDiff ?? ""),
          explanation: String(report.patch.explanation ?? ""),
          applied: Boolean(report.patch.applied)
        }
      : undefined,
    rerun: isRecord(report.rerun)
      ? {
          testFilePath: String(report.rerun.testFilePath ?? ""),
          selector: String(report.rerun.selector ?? ""),
          passed: Boolean(report.rerun.passed),
          expectedText: String(report.rerun.expectedText ?? ""),
          durationMs:
            typeof report.rerun.durationMs === "number"
              ? report.rerun.durationMs
              : undefined,
          errorMessage:
            typeof report.rerun.errorMessage === "string"
              ? report.rerun.errorMessage
              : undefined
        }
      : undefined,
    output: isRecord(report.output)
      ? {
          kind:
            report.output.kind === "safe_heal" ||
            report.output.kind === "product_bug" ||
            report.output.kind === "spec_outdated" ||
            report.output.kind === "operational_error"
              ? report.output.kind
              : "operational_error",
          title: String(report.output.title ?? ""),
          summary: String(report.output.summary ?? ""),
          recommendedAction: String(report.output.recommendedAction ?? ""),
          evidence: Array.isArray(report.output.evidence)
            ? report.output.evidence.map(String)
            : [],
          safetyNote: String(report.output.safetyNote ?? "")
        }
      : undefined,
    timeline: Array.isArray(report.timeline)
      ? report.timeline.filter(isTimelineEvent)
      : []
  };
}

export function serializeRun(run: SpecHealRun) {
  return {
    ...run,
    report: normalizeRunReport(run.report),
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isTimelineEvent(value: unknown): value is RunTimelineEvent {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.title === "string" &&
    typeof value.status === "string" &&
    typeof value.detail === "string" &&
    typeof value.timestamp === "string"
  );
}
