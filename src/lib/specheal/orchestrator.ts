import { findShopFlowScenario } from "@/demo/shopflow";
import { appendTimelineEvent } from "./run-report";
import { findRecoveryRun, updateRecoveryRun } from "./runs";

const activeRuns = new Set<string>();

export function startRunOrchestration(runId: string) {
  if (activeRuns.has(runId)) {
    return;
  }

  activeRuns.add(runId);

  setTimeout(() => {
    void orchestrateRecoveryRun(runId).finally(() => {
      activeRuns.delete(runId);
    });
  }, 0);
}

async function orchestrateRecoveryRun(runId: string) {
  const run = await findRecoveryRun(runId);

  if (!run) {
    return;
  }

  const scenario = findShopFlowScenario(run.scenarioId);

  if (!scenario) {
    await updateRecoveryRun(runId, {
      status: "failed",
      verdict: "RUN_ERROR",
      failedStage: "scenario_lookup",
      errorMessage: `Unknown scenario for persisted run: ${run.scenarioId}`,
      report: appendTimelineEvent(run.report, {
        key: "scenario-lookup-failed",
        title: "Scenario lookup failed",
        status: "failed",
        detail: `SpecHeal could not find scenario ${run.scenarioId}.`,
        timestamp: new Date().toISOString()
      })
    });
    return;
  }

  const runningReport = appendTimelineEvent(run.report, {
    key: "orchestration-started",
    title: "Recovery orchestration started",
    status: "running",
    detail: `Runner selected ${scenario.title} and prepared ShopFlow state ${scenario.runtimeState}.`,
    timestamp: new Date().toISOString()
  });

  await updateRecoveryRun(runId, {
    status: "running",
    report: runningReport
  });

  await markPendingPlaywrightPipeline(runId, runningReport);
}

async function markPendingPlaywrightPipeline(
  runId: string,
  report: Record<string, unknown>
) {
  await updateRecoveryRun(runId, {
    status: "failed",
    verdict: "RUN_ERROR",
    reason:
      "The run orchestration API is ready, but the Playwright evidence pipeline is implemented in the next OpenSpec section.",
    failedStage: "playwright_execution",
    errorMessage: "Playwright checkout execution is not implemented yet.",
    report: appendTimelineEvent(report, {
      key: "playwright-pending",
      title: "Playwright execution pending",
      status: "failed",
      detail:
        "Section 4 will replace this operational terminal state with real browser execution and evidence capture.",
      timestamp: new Date().toISOString()
    })
  });
}
