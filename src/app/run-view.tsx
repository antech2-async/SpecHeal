"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { RunReport, RunTimelineEvent } from "@/lib/specheal/run-report";

export type SerializedRun = {
  id: string;
  projectId: string;
  scenarioId: string;
  scenarioState: string;
  status: "pending" | "running" | "completed" | "failed";
  verdict: "NO_HEAL_NEEDED" | "HEAL" | "PRODUCT BUG" | "SPEC OUTDATED" | "RUN_ERROR" | null;
  reason: string | null;
  confidence: number | null;
  failedStage: string | null;
  errorMessage: string | null;
  targetUrl: string | null;
  baselineSelector: string | null;
  candidateSelector: string | null;
  testFilePath: string | null;
  openSpecPath: string | null;
  openSpecClause: string | null;
  report: RunReport;
  createdAt: string;
  updatedAt: string;
};

export type RunArtifacts = {
  evidence: ArtifactRecord | null;
  aiTrace: AiTraceArtifact | null;
  validation: ArtifactRecord | null;
  patch: ArtifactRecord | null;
  rerun: ArtifactRecord | null;
  jiraResults: JiraResultArtifact[];
};

type ArtifactRecord = Record<string, unknown> & {
  id: string;
  runId: string;
  createdAt: string;
};

type AiTraceArtifact = ArtifactRecord & {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  rawResponse: string | null;
  parsedResponse: Record<string, unknown> | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type JiraResultArtifact = ArtifactRecord & {
  status: "not_required" | "pending" | "published" | "jira_publish_failed";
  issueType: string | null;
  issueKey: string | null;
  issueUrl: string | null;
  issueId: string | null;
  payloadSummary: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type RunReportViewProps = {
  run: SerializedRun;
  artifacts?: RunArtifacts | null;
  mode: "dashboard" | "full";
};

export function RunReportView({ run, artifacts, mode }: RunReportViewProps) {
  const report = run.report;
  const latestJira = artifacts?.jiraResults[0] ?? null;
  const verdictMeta = getVerdictMeta(run);
  const timeline = getDisplayTimeline(run);

  return (
    <article className={mode === "full" ? "reportPage" : "runReport"}>
      <header className={`reportHeader ${verdictMeta.tone}`}>
        <div>
          <p className="eyebrow">{report.scenario.title}</p>
          <h2>{verdictMeta.title}</h2>
          <p>{run.reason ?? verdictMeta.summary}</p>
        </div>
        <div className={`verdictCard ${verdictMeta.tone}`}>
          <span>Verdict</span>
          <strong>{run.verdict ?? run.status}</strong>
          <small>{verdictMeta.caption}</small>
          {mode === "dashboard" && (run.status === "completed" || run.status === "failed") ? (
            <a className="reportAction" href={`/runs/${run.id}`}>
              Full report
            </a>
          ) : null}
        </div>
      </header>

      <section className="metricStrip" aria-label="Run facts">
        <Metric label="Scenario" value={run.scenarioId} />
        <Metric label="Target" value={run.scenarioState} />
        <Metric
          label="AI confidence"
          value={run.confidence == null ? "n/a" : `${Math.round(run.confidence * 100)}%`}
        />
        <Metric
          label="Jira"
          value={
            latestJira?.issueKey ??
            latestJira?.status ??
            (run.verdict === "NO_HEAL_NEEDED" ? "not required" : "pending")
          }
        />
      </section>

      <DecisionStrip jira={latestJira} run={run} />

      {run.verdict === "NO_HEAL_NEEDED" ? (
        <div className="notice successNotice">
          Healthy run persisted as an audit report. Jira publishing is not
          required by default.
        </div>
      ) : null}

      <section className="timeline" aria-label="Run timeline">
        {timeline.map((event) => (
          <div className={`timelineItem ${event.status}`} key={event.key}>
            <span />
            <div>
              <strong>{event.title}</strong>
              <p>{event.detail}</p>
              <small>{new Date(event.timestamp).toLocaleString()}</small>
            </div>
          </div>
        ))}
      </section>

      <section className="reportGrid" aria-label="Run report panels">
        <Panel eyebrow="01" title="Playwright">
          {report.playwright ? (
            <dl className="kvList">
              <Row label="Result" value={report.playwright.passed ? "passed" : "failed"} />
              <Row label="Selector" value={report.playwright.selectorUsed} />
              <Row label="Duration" value={`${report.playwright.durationMs} ms`} />
              {report.playwright.errorMessage ? (
                <Row label="Error" value={report.playwright.errorMessage} />
              ) : null}
            </dl>
          ) : (
            <p className="emptyText">Waiting for browser execution.</p>
          )}
        </Panel>

        <Panel eyebrow="02" title="OpenSpec">
          <p className="pathText">{report.openSpec.path}</p>
          <pre className="codeBlock">{report.openSpec.clause}</pre>
        </Panel>

        <Panel eyebrow="03" title="Evidence">
          {report.evidence ? (
            <div className="evidenceStack">
              {report.evidence.screenshotBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Captured Playwright failure screenshot"
                  className="evidenceImage"
                  src={`data:image/png;base64,${report.evidence.screenshotBase64}`}
                />
              ) : null}
              <dl className="kvList">
                <Row label="Failed selector" value={report.evidence.failedSelector} />
                <Row label="Raw DOM" value={`${report.evidence.rawDomLength} chars`} />
                <Row label="Clean DOM" value={`${report.evidence.cleanedDomLength} chars`} />
                <Row label="Candidates" value={`${report.evidence.candidateCount}`} />
              </dl>
              <CandidateList candidates={report.evidence.candidates} />
            </div>
          ) : (
            <p className="emptyText">No failure evidence for this run.</p>
          )}
        </Panel>

        <Panel eyebrow="04" title="Decision Output">
          {report.output ? (
            <div className="outputPanel">
              <strong>{report.output.title}</strong>
              <p>{report.output.summary}</p>
              <p>{report.output.recommendedAction}</p>
              <ul>
                {report.output.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="notice">{report.output.safetyNote}</div>
            </div>
          ) : (
            <p className="emptyText">Decision output is not ready yet.</p>
          )}
        </Panel>

        <Panel eyebrow="05" title="Proof">
          <ProofPanel run={run} />
        </Panel>

        <Panel eyebrow="06" title="Jira">
          <JiraPanel jira={latestJira} run={run} />
        </Panel>
      </section>

      <AiTracePanel aiTrace={artifacts?.aiTrace ?? null} run={run} />
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="reportPanel">
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{cleanDisplayText(value)}</dd>
    </div>
  );
}

function CandidateList({ candidates }: { candidates: Record<string, unknown>[] }) {
  if (candidates.length === 0) {
    return (
      <div className="emptyEvidence">
        <strong>Zero valid candidates found</strong>
        <p>SpecHeal did not find an interactive payment control that is safe to validate.</p>
      </div>
    );
  }

  return (
    <div className="candidateList">
      {candidates.slice(0, 5).map((candidate, index) => (
        <div className="candidateItem" key={`${candidate.selector}-${index}`}>
          <strong>{String(candidate.selector ?? "unknown")}</strong>
          <span>{String(candidate.rankReason ?? "ranked candidate")}</span>
        </div>
      ))}
    </div>
  );
}

function DecisionStrip({
  jira,
  run
}: {
  jira: JiraResultArtifact | null;
  run: SerializedRun;
}) {
  const report = run.report;
  const playwrightValue = report.playwright?.passed
    ? "Baseline passed"
    : report.playwright
      ? `Failed at ${report.playwright.selectorUsed}`
      : "Waiting for run";
  const guardrailValue =
    run.verdict === "NO_HEAL_NEEDED"
      ? "Skipped after baseline pass"
      : "Checkout OpenSpec applied";
  const decisionValue = getDecisionSummary(run, jira);

  return (
    <section className="decisionStrip" aria-label="Decision summary">
      <DecisionNode label="Evidence" tone={report.playwright?.passed ? "positive" : "neutral"} value={playwrightValue} />
      <DecisionNode label="Guardrail" tone="spec" value={guardrailValue} />
      <DecisionNode label="Outcome" tone={getVerdictMeta(run).tone} value={decisionValue} />
    </section>
  );
}

function DecisionNode({
  label,
  tone,
  value
}: {
  label: string;
  tone: "positive" | "negative" | "warning" | "neutral" | "spec";
  value: string;
}) {
  return (
    <div className={`decisionNode ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProofPanel({ run }: { run: SerializedRun }) {
  const report = run.report;

  if (run.verdict === "HEAL") {
    return (
      <div className="proofStack">
        <ProofStep
          detail={report.validation?.reason ?? "Candidate selector validation has not completed."}
          label="Candidate validation"
          tone={report.validation?.passed ? "positive" : "negative"}
          value={
            report.validation
              ? `${report.validation.passed ? "Passed" : "Failed"} (${report.validation.elementCount} match)`
              : "Pending"
          }
        />
        <ProofStep
          detail={
            report.rerun?.passed
              ? `Patched test reached ${report.rerun.expectedText}.`
              : report.rerun?.errorMessage ?? "Rerun proof has not completed."
          }
          label="Rerun proof"
          tone={report.rerun?.passed ? "positive" : "negative"}
          value={report.rerun ? (report.rerun.passed ? "Passed" : "Failed") : "Pending"}
        />
        <ProofStep
          detail={report.patch?.explanation ?? "Patch preview appears only after validation and rerun pass."}
          label="Patch"
          tone={report.patch?.applied ? "positive" : "neutral"}
          value={report.patch ? (report.patch.applied ? "Applied in runtime" : "Preview") : "Waiting"}
        />
        {report.patch?.appliedDiff ? (
          <pre className="codeBlock proofDiff">{report.patch.appliedDiff}</pre>
        ) : null}
      </div>
    );
  }

  if (run.verdict === "PRODUCT BUG") {
    return (
      <div className="proofStack">
        <ProofStep
          detail="OpenSpec-required payment behavior is missing, so a locator patch would create a false green."
          label="Patch safety"
          tone="negative"
          value="Blocked"
        />
        <ProofStep
          detail="There is no valid interactive payment candidate to validate for this product state."
          label="Candidate validation"
          tone="neutral"
          value="Skipped by design"
        />
        <ProofStep
          detail="Rerun proof only applies after a validated HEAL patch."
          label="Rerun proof"
          tone="neutral"
          value="Not applicable"
        />
      </div>
    );
  }

  if (run.verdict === "NO_HEAL_NEEDED") {
    return (
      <div className="proofStack">
        <ProofStep
          detail="The original Playwright selector reached Payment Success."
          label="Baseline proof"
          tone="positive"
          value="Passed"
        />
        <ProofStep
          detail="AI recovery, candidate validation, patch generation, and rerun proof are intentionally skipped."
          label="Recovery"
          tone="neutral"
          value="Not needed"
        />
        <ProofStep
          detail="Healthy runs remain persisted as audit reports without a Jira issue by default."
          label="Jira"
          tone="neutral"
          value="Report only"
        />
      </div>
    );
  }

  if (run.verdict === "SPEC OUTDATED") {
    return (
      <div className="proofStack">
        <ProofStep
          detail="Selector replacement is not enough because the test/spec mapping needs human review."
          label="Patch safety"
          tone="warning"
          value="Blocked"
        />
        <ProofStep
          detail="SpecHeal creates a task instead of presenting a safe heal."
          label="Follow-up"
          tone="warning"
          value="Human review"
        />
      </div>
    );
  }

  if (run.verdict === "RUN_ERROR" || run.status === "failed") {
    return (
      <div className="proofStack">
        <ProofStep
          detail={run.errorMessage ?? "The run stopped before a trusted recovery result was produced."}
          label={run.failedStage ?? "Runtime"}
          tone="negative"
          value="Operational failure"
        />
      </div>
    );
  }

  return (
    <div className="proofStack">
      <ProofStep
        detail="SpecHeal is still collecting run evidence."
        label="Run proof"
        tone="neutral"
        value="Pending"
      />
    </div>
  );
}

function ProofStep({
  detail,
  label,
  tone,
  value
}: {
  detail: string;
  label: string;
  tone: "positive" | "negative" | "warning" | "neutral";
  value: string;
}) {
  return (
    <div className={`proofStep ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <p>{detail}</p>
    </div>
  );
}

function JiraPanel({
  jira,
  run
}: {
  jira: JiraResultArtifact | null;
  run: SerializedRun;
}) {
  const [result, setResult] = useState(jira);
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    const response = await fetch(`/api/runs/${run.id}/jira/retry`, {
      method: "POST"
    });
    const payload = (await response.json()) as {
      jiraResult?: JiraResultArtifact;
    };
    setResult(payload.jiraResult ?? result);
    setRetrying(false);
  }

  if (!result) {
    return <p className="emptyText">Jira has not been attempted yet.</p>;
  }

  return (
    <div className="jiraPanel">
      <dl className="kvList">
        <Row label="Status" value={result.status} />
        <Row label="Issue type" value={result.issueType ?? "n/a"} />
        <Row label="Issue" value={result.issueKey ?? "n/a"} />
      </dl>
      {result.issueUrl ? <a href={result.issueUrl}>{result.issueUrl}</a> : null}
      {result.errorMessage ? <p className="inlineError">{result.errorMessage}</p> : null}
      {result.status === "jira_publish_failed" ? (
        <button className="secondaryAction" disabled={retrying} type="button" onClick={retry}>
          {retrying ? "Retrying" : "Retry Jira publish"}
        </button>
      ) : null}
    </div>
  );
}

function AiTracePanel({
  aiTrace,
  run
}: {
  aiTrace: AiTraceArtifact | null;
  run: SerializedRun;
}) {
  const reportAi = run.report.ai;

  return (
    <details className="traceDrawer">
      <summary>
        <span>AI trace</span>
        <small>
          {aiTrace
            ? "Prompt, raw response, parsed verdict, usage, and cost"
            : run.verdict === "NO_HEAL_NEEDED"
              ? "Skipped because the baseline passed"
              : "Unavailable for this run"}
        </small>
      </summary>
      {aiTrace ? (
        <div className="traceGrid">
          <dl className="kvList">
            <Row label="Model" value={aiTrace.model} />
            <Row label="Prompt tokens" value={String(aiTrace.promptTokens ?? "n/a")} />
            <Row label="Completion tokens" value={String(aiTrace.completionTokens ?? "n/a")} />
            <Row label="Estimated cost" value={String(aiTrace.estimatedCostUsd ?? "n/a")} />
            {aiTrace.errorMessage ? <Row label="AI error" value={aiTrace.errorMessage} /> : null}
          </dl>
          <pre className="codeBlock">{aiTrace.systemPrompt}</pre>
          <pre className="codeBlock">{aiTrace.userPrompt}</pre>
          <pre className="codeBlock">
            {aiTrace.rawResponse ??
              JSON.stringify(aiTrace.parsedResponse ?? {}, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="emptyText">
          {reportAi?.status === "failed"
            ? reportAi.errorMessage
            : "AI recovery was skipped or has not run yet."}
        </p>
      )}
    </details>
  );
}

function getVerdictMeta(run: SerializedRun) {
  if (run.verdict === "HEAL") {
    return {
      caption: "Validated patch and rerun proof",
      summary:
        "SpecHeal validated a replacement selector, applied the controlled test patch, and proved checkout still reaches Payment Success.",
      title: "Safe heal ready for review",
      tone: "positive" as const
    };
  }

  if (run.verdict === "PRODUCT BUG") {
    return {
      caption: "Escalate product behavior",
      summary:
        "OpenSpec requires a payment action, but the page evidence shows the required behavior is unavailable.",
      title: "Do not heal this failure",
      tone: "negative" as const
    };
  }

  if (run.verdict === "NO_HEAL_NEEDED") {
    return {
      caption: "Audit report only",
      summary:
        "The original Playwright selector reached Payment Success, so recovery steps are intentionally skipped.",
      title: "Baseline checkout is healthy",
      tone: "positive" as const
    };
  }

  if (run.verdict === "SPEC OUTDATED") {
    return {
      caption: "Human review required",
      summary:
        "The current test/spec mapping needs review before a safe recovery path can be proposed.",
      title: "Spec or test mapping is outdated",
      tone: "warning" as const
    };
  }

  if (run.verdict === "RUN_ERROR" || run.status === "failed") {
    return {
      caption: run.failedStage ?? "Operational failure",
      summary:
        "The run stopped before SpecHeal could produce a trusted terminal recovery result.",
      title: "Recovery run needs attention",
      tone: "negative" as const
    };
  }

  if (run.status === "running") {
    return {
      caption: "Collecting evidence",
      summary: "SpecHeal is running Playwright and preparing the recovery trail.",
      title: "Recovery run in progress",
      tone: "neutral" as const
    };
  }

  return {
    caption: "Queued",
    summary: "SpecHeal has created the run and is waiting for orchestration.",
    title: "Recovery run queued",
    tone: "neutral" as const
  };
}

function getDecisionSummary(run: SerializedRun, jira: JiraResultArtifact | null) {
  if (run.verdict === "HEAL") {
    return jira?.issueKey
      ? `Safe patch proved, Jira ${jira.issueKey}`
      : "Safe patch proved";
  }

  if (run.verdict === "PRODUCT BUG") {
    return jira?.issueKey
      ? `Product bug escalated, Jira ${jira.issueKey}`
      : "Product bug escalation";
  }

  if (run.verdict === "NO_HEAL_NEEDED") {
    return "Persisted audit report";
  }

  if (run.verdict === "SPEC OUTDATED") {
    return jira?.issueKey
      ? `Spec review task, Jira ${jira.issueKey}`
      : "Spec review task";
  }

  if (run.verdict === "RUN_ERROR" || run.status === "failed") {
    return "Operational follow-up";
  }

  return "Waiting for verdict";
}

function getDisplayTimeline(run: SerializedRun): RunTimelineEvent[] {
  const timeline = run.report.timeline;

  if (run.verdict === "NO_HEAL_NEEDED") {
    return [
      ...timeline,
      {
        detail:
          "AI recovery, candidate validation, patch generation, and rerun proof are skipped because the baseline reached Payment Success.",
        key: "recovery-not-needed",
        status: "skipped",
        timestamp: run.updatedAt,
        title: "Recovery proof not needed"
      },
      {
        detail:
          "Healthy runs stay in PostgreSQL as audit reports. Jira publishing is intentionally not required by default.",
        key: "jira-report-only",
        status: "skipped",
        timestamp: run.updatedAt,
        title: "Jira skipped for healthy run"
      }
    ];
  }

  if (run.verdict === "PRODUCT BUG") {
    return [
      ...timeline,
      {
        detail:
          "SpecHeal blocks selector healing because the required payment behavior is missing or unavailable.",
        key: "safe-heal-blocked",
        status: "skipped",
        timestamp: run.updatedAt,
        title: "Safe heal blocked"
      }
    ];
  }

  return timeline;
}

function cleanDisplayText(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "").trim();
}
