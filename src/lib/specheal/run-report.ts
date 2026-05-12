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
