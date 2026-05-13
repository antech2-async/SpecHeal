"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ShopFlowScenario } from "@/demo/shopflow";
import { formatRunDate } from "@/lib/display";
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
  ["01", "Playwright", "Run the seeded checkout behavior in a real browser."],
  ["02", "Evidence", "Capture failure screenshot, visible text, DOM, and candidates."],
  ["03", "OpenSpec", "Compare the failure against selector-agnostic requirements."],
  ["04", "OpenAI", "Ask for a structured recovery verdict with transparent trace."],
  ["05", "Proof", "Validate candidate selectors and rerun only when HEAL is safe."],
  ["06", "Jira", "Publish actionable HEAL, bug, spec, or runtime follow-up."]
] as const;

const SCENARIO_OUTCOMES: Record<string, { tone: string; value: string }> = {
  "healthy-flow": { tone: "positive", value: "Report only" },
  "locator-drift": { tone: "positive", value: "Safe HEAL proof" },
  "product-bug": { tone: "negative", value: "Jira Bug" }
};

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
  const missingRuntimeCount = readiness.filter((item) => !item.ready).length;
  const selectedTargetUrl = `/shopflow?state=${
    selectedScenario?.runtimeState ?? "normal"
  }`;

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
    if (!selectedScenario || isRunning) {
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
            Prove whether a ShopFlow checkout failure should be healed, escalated,
            or recorded as a healthy audit run.
          </p>
        </div>
        <div className="projectBadge">
          <span>Active project</span>
          <strong>ShopFlow Checkout</strong>
        </div>
      </section>

      <section className="demoStatusBar" aria-label="Active demo context">
        <div>
          <span>Scenario</span>
          <strong>{selectedScenario?.title ?? "Select scenario"}</strong>
        </div>
        <div>
          <span>Expected outcome</span>
          <strong>{selectedScenario ? SCENARIO_OUTCOMES[selectedScenario.id]?.value : "Decision"}</strong>
        </div>
        <div>
          <span>Target route</span>
          <strong>{selectedTargetUrl}</strong>
        </div>
        <div className={isRunning ? "active" : currentRun ? getRunTone(currentRun) : ""}>
          <span>Run state</span>
          <strong>{getCurrentRunLabel(currentRun, isRunning)}</strong>
        </div>
      </section>

      <section className="workbench">
        <aside className="scenarioRail" aria-label="Scenario picker">
          <div className="controlPanel">
            <div className="controlPanelHeader">
              <div>
                <p className="eyebrow">Demo control</p>
                <h2>ShopFlow Checkout</h2>
                <p>
                  Choose a seeded state, run one recovery proof, then inspect the
                  verdict trail only where it matters.
                </p>
              </div>
              <span className={isRunning ? "statusPill active" : "statusPill"}>
                {getCurrentRunLabel(currentRun, isRunning)}
              </span>
            </div>

            <button
              className="primaryAction"
              type="button"
              disabled={loading || isRunning || !selectedScenario}
              onClick={startRun}
            >
              {loading
                ? "Starting proof"
                : isRunning
                  ? "Running proof"
                  : "Run recovery proof"}
            </button>

            <div className="selectedRunLine">
              <span className="dot ready" />
              <span>
                Selected: <strong>{selectedScenario?.title ?? "Scenario"}</strong>
              </span>
            </div>

            <div className="panelHeader scenarioHeader">
              <span>Scenarios</span>
              <a href={selectedTargetUrl}>Open ShopFlow</a>
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
                  <em className={`scenarioOutcome ${SCENARIO_OUTCOMES[scenario.id]?.tone ?? "neutral"}`}>
                    {SCENARIO_OUTCOMES[scenario.id]?.value ?? "Decision"}
                  </em>
                  <span>{scenario.title}</span>
                  <strong>{scenario.label}</strong>
                  <small>{scenario.summary}</small>
                </button>
              ))}
            </div>

            <div className="controlMetaGrid" aria-label="Selected scenario facts">
              <div>
                <span>Target</span>
                <strong>{selectedTargetUrl}</strong>
              </div>
              <div>
                <span>Selector</span>
                <strong>{selectedScenario?.oldSelector ?? "n/a"}</strong>
              </div>
              <div>
                <span>Guardrail</span>
                <strong>OpenSpec</strong>
              </div>
              <div className={missingRuntimeCount ? "warning" : "positive"}>
                <span>Runtime</span>
                <strong>
                  {missingRuntimeCount
                    ? `${missingRuntimeCount} missing`
                    : "Ready"}
                </strong>
              </div>
            </div>

            <details className="guardrailDetails">
              <summary>
                <span>OpenSpec guardrail</span>
                <strong>Behavior first, selector second</strong>
              </summary>
              <p>
                SpecHeal checks whether checkout payment behavior still exists
                before trusting any replacement locator.
              </p>
            </details>

            <div className="readinessPills" aria-label="Runtime readiness">
              {readiness.map((item) => (
                <span
                  className={item.ready ? "readinessPill ready" : "readinessPill missing"}
                  key={item.name}
                  title={item.message}
                >
                  <span className={item.ready ? "dot ready" : "dot missing"} />
                  {item.name}
                </span>
              ))}
            </div>

            {message ? <p className="inlineError">{message}</p> : null}
          </div>
        </aside>

        <section className="runStage" aria-label="Current run">
          {currentRun && isRunning ? (
            <RunningRunPanel run={currentRun} selectedScenarioTitle={selectedScenario?.title ?? currentRun.scenarioId} />
          ) : currentRun ? (
            <RunReportView
              artifacts={currentArtifacts}
              mode="dashboard"
              run={currentRun}
            />
          ) : (
            <div className="emptyState">
              <div className="emptyStateHeader">
                <p className="eyebrow">Ready</p>
                <h2>{selectedScenario?.title ?? "Select a scenario"}</h2>
                <p>{selectedScenario?.summary}</p>
              </div>
              <div className="selectedScenarioBrief">
                <div>
                  <span>Baseline selector</span>
                  <strong>{selectedScenario?.oldSelector ?? "n/a"}</strong>
                </div>
                <div>
                  <span>Expected behavior</span>
                  <strong>{selectedScenario?.expectedText ?? "Payment Success"}</strong>
                </div>
                <div>
                  <span>Expected outcome</span>
                  <strong>{selectedScenario ? SCENARIO_OUTCOMES[selectedScenario.id]?.value : "Decision"}</strong>
                </div>
              </div>
              <section className="demoThesis" aria-label="Demo decision model">
                <div>
                  <span>Question</span>
                  <strong>Should this failed UI test be healed?</strong>
                </div>
                <div>
                  <span>Guardrail</span>
                  <strong>OpenSpec checks product behavior before any patch is trusted.</strong>
                </div>
                <div>
                  <span>Proof</span>
                  <strong>Browser validation and rerun decide whether the patch is safe.</strong>
                </div>
              </section>
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

      <section className="recentRuns" aria-label="Recent recovery runs">
        <div className="panelHeader">
          <span>Recent runs</span>
          <button type="button" onClick={loadRecentRuns}>
            Refresh
          </button>
        </div>
        {recentRuns.length === 0 ? (
          <p className="emptyText">No persisted runs yet.</p>
        ) : (
          <div className="recentRunList">
            {recentRuns.map((run) => (
              <a className="recentRun" href={`/runs/${run.id}`} key={run.id}>
                <span>{run.scenarioId}</span>
                <strong className={`recentVerdict ${getRunTone(run)}`}>
                  {run.verdict ?? run.status}
                </strong>
                <small>
                  {run.candidateSelector ? `${run.candidateSelector} - ` : ""}
                  {formatRunDate(run.createdAt)}
                </small>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function RunningRunPanel({
  run,
  selectedScenarioTitle
}: {
  run: SerializedRun;
  selectedScenarioTitle: string;
}) {
  return (
    <article className="runningPanel" aria-live="polite">
      <header className="runningHeader">
        <div>
          <p className="eyebrow">SpecHeal run</p>
          <h2>Running recovery sequence</h2>
          <p>
            {selectedScenarioTitle} is moving through browser execution,
            OpenSpec guardrails, and proof capture.
          </p>
        </div>
        <div className="runningBadge">
          <span>{run.status}</span>
          <strong>{run.scenarioState}</strong>
        </div>
      </header>

      <div className="runningProgress" aria-hidden="true">
        <span />
      </div>

      <div className="runningMeta" aria-label="Active run details">
        <div>
          <span>Run ID</span>
          <strong>{run.id.slice(0, 8)}</strong>
        </div>
        <div>
          <span>Baseline selector</span>
          <strong>{run.baselineSelector}</strong>
        </div>
        <div>
          <span>Started</span>
          <strong>{formatRunDate(run.createdAt)}</strong>
        </div>
      </div>

      <div className="runningSteps" aria-label="Recovery progress">
        {RUN_STORY_PREVIEW.map(([index, title, summary], stepIndex) => (
          <div
            className={stepIndex === 0 ? "runningStep active" : "runningStep"}
            key={index}
          >
            <span>{index}</span>
            <div>
              <strong>{title}</strong>
              <p>{summary}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function getRunTone(run: SerializedRun) {
  if (run.verdict === "PRODUCT BUG" || run.verdict === "RUN_ERROR" || run.status === "failed") {
    return "negative";
  }

  if (run.verdict === "SPEC OUTDATED") {
    return "warning";
  }

  if (run.verdict === "HEAL" || run.verdict === "NO_HEAL_NEEDED") {
    return "positive";
  }

  return "neutral";
}

function getCurrentRunLabel(run: SerializedRun | null, isRunning: boolean) {
  if (isRunning) {
    return "Running recovery";
  }

  if (!run) {
    return "Ready";
  }

  return run.verdict ?? run.status;
}
