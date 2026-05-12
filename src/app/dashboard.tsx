"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ShopFlowScenario } from "@/demo/shopflow";
import { RunReportView, type RunArtifacts, type SerializedRun } from "./run-view";

type ReadinessItem = {
  name: string;
  ready: boolean;
  message: string;
};

type DashboardProps = {
  initialRuns: SerializedRun[];
  readiness: ReadinessItem[];
  scenarios: ShopFlowScenario[];
};

type RunResponse = {
  run: SerializedRun;
  artifacts?: RunArtifacts;
  pollUrl?: string;
};

const RUN_STORY_PREVIEW = [
  ["01", "Playwright", "Run the checkout behavior in a real browser."],
  ["02", "Evidence", "Capture screenshot, DOM, visible text, and candidates."],
  ["03", "OpenSpec", "Load behavior-first checkout requirements as guardrail."],
  ["04", "OpenAI", "Classify HEAL, PRODUCT BUG, or report-only healthy run."],
  ["05", "Proof", "Validate and rerun only when a safe HEAL patch exists."],
  ["06", "Jira", "Publish actionable results into the configured project."]
] as const;

export function Dashboard({ initialRuns, readiness, scenarios }: DashboardProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id);
  const [currentRun, setCurrentRun] = useState<SerializedRun | null>(null);
  const [currentArtifacts, setCurrentArtifacts] = useState<RunArtifacts | null>(
    null
  );
  const [recentRuns, setRecentRuns] = useState<SerializedRun[]>(initialRuns);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedScenario = useMemo(
    () =>
      scenarios.find((scenario) => scenario.id === selectedScenarioId) ??
      scenarios[0],
    [scenarios, selectedScenarioId]
  );
  const isRunning =
    currentRun?.status === "pending" || currentRun?.status === "running";

  const loadRecentRuns = useCallback(async () => {
    try {
      const response = await fetch("/api/runs?limit=6", { cache: "no-store" });
      const payload = (await response.json()) as { runs?: SerializedRun[] };
      setRecentRuns(payload.runs ?? []);
    } catch {
      setRecentRuns([]);
    }
  }, []);

  const pollRun = useCallback(async (runId: string) => {
    const response = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
    const payload = (await response.json()) as RunResponse;

    if (payload.run) {
      setCurrentRun(payload.run);
      setCurrentArtifacts(payload.artifacts ?? null);
      if (payload.run.status === "completed" || payload.run.status === "failed") {
        await loadRecentRuns();
      }
    }
  }, [loadRecentRuns]);

  useEffect(() => {
    if (!currentRun || !isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      void pollRun(currentRun.id);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [currentRun, isRunning, pollRun]);

  async function startRun() {
    if (!selectedScenario) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: selectedScenario.id })
      });
      const payload = (await response.json()) as RunResponse & {
        error?: string;
        detail?: string;
      };

      if (!response.ok || !payload.run) {
        throw new Error(payload.error || payload.detail || "Run creation failed.");
      }

      setCurrentRun(payload.run);
      setCurrentArtifacts(payload.artifacts ?? null);
      await pollRun(payload.run.id);
      await loadRecentRuns();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run failed to start.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cockpitShell">
      <section className="cockpitHeader">
        <div>
          <p className="eyebrow">SpecHeal</p>
          <h1>Recovery cockpit</h1>
          <p>
            Run a ShopFlow checkout scenario, inspect the OpenSpec-guarded
            verdict, and follow the evidence through Jira handoff.
          </p>
        </div>
        <div className="projectBadge">
          <span>Active project</span>
          <strong>ShopFlow Checkout</strong>
        </div>
      </section>

      <section className="readiness" aria-label="Runtime readiness">
        {readiness.map((item) => (
          <div className="readinessItem" key={item.name}>
            <span className={item.ready ? "dot ready" : "dot missing"} />
            <div>
              <strong>{item.name}</strong>
              <p>{item.message}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="workbench">
        <aside className="scenarioRail" aria-label="Scenario picker">
          <div className="panelHeader">
            <span>Scenarios</span>
            <a href="/shopflow?state=normal">Open target</a>
          </div>
          <div className="scenarioPicker">
            {scenarios.map((scenario) => (
              <button
                className={
                  selectedScenario?.id === scenario.id
                    ? "scenarioOption active"
                    : "scenarioOption"
                }
                key={scenario.id}
                type="button"
                onClick={() => setSelectedScenarioId(scenario.id)}
              >
                <span>{scenario.title}</span>
                <strong>{scenario.label}</strong>
                <small>{scenario.summary}</small>
              </button>
            ))}
          </div>
          <button
            className="primaryAction"
            type="button"
            disabled={loading || !selectedScenario}
            onClick={startRun}
          >
            {loading ? "Starting run" : "Start SpecHeal run"}
          </button>
          {message ? <p className="inlineError">{message}</p> : null}

          <div className="recentRuns">
            <div className="panelHeader">
              <span>Recent runs</span>
              <button type="button" onClick={loadRecentRuns}>
                Refresh
              </button>
            </div>
            {recentRuns.length === 0 ? (
              <p className="emptyText">No persisted runs yet.</p>
            ) : (
              recentRuns.map((run) => (
                <a className="recentRun" href={`/runs/${run.id}`} key={run.id}>
                  <span>{run.scenarioId}</span>
                  <strong>{run.verdict ?? run.status}</strong>
                  <small>{new Date(run.createdAt).toLocaleString()}</small>
                </a>
              ))
            )}
          </div>
        </aside>

        <section className="runStage" aria-label="Current run">
          {currentRun ? (
            <RunReportView
              artifacts={currentArtifacts}
              mode="dashboard"
              run={currentRun}
            />
          ) : (
            <div className="emptyState">
              <div>
                <p className="eyebrow">Ready</p>
                <h2>{selectedScenario?.title ?? "Select a scenario"}</h2>
                <p>{selectedScenario?.summary}</p>
              </div>
              <div className="previewFlow" aria-label="SpecHeal run preview">
                {RUN_STORY_PREVIEW.map(([index, title, summary]) => (
                  <div className="previewStep" key={index}>
                    <span>{index}</span>
                    <div>
                      <strong>{title}</strong>
                      <p>{summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
