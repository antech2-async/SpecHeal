"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { RunReport } from "@/lib/specheal/run-report";

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

  return (
    <article className={mode === "full" ? "reportPage" : "runReport"}>
      <header className="reportHeader">
        <div>
          <p className="eyebrow">{report.scenario.title}</p>
          <h2>{run.verdict ?? run.status}</h2>
          <p>{run.reason ?? report.scenario.summary}</p>
        </div>
        <div className={`statusBadge ${statusClass(run.verdict ?? run.status)}`}>
          <span>Status</span>
          <strong>{run.status}</strong>
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

      {run.verdict === "NO_HEAL_NEEDED" ? (
        <div className="notice successNotice">
          Healthy run persisted as an audit report. Jira publishing is not
          required by default.
        </div>
      ) : null}

      <section className="timeline" aria-label="Run timeline">
        {report.timeline.map((event) => (
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
        <Panel title="Playwright">
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

        <Panel title="OpenSpec">
          <p className="pathText">{report.openSpec.path}</p>
          <pre className="codeBlock">{report.openSpec.clause}</pre>
        </Panel>

        <Panel title="Evidence">
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

        <Panel title="Decision Output">
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

        <Panel title="Proof">
          <dl className="kvList">
            <Row
              label="Validation"
              value={
                report.validation
                  ? `${report.validation.passed ? "passed" : "failed"} (${report.validation.elementCount})`
                  : "not run"
              }
            />
            <Row
              label="Rerun"
              value={report.rerun ? (report.rerun.passed ? "passed" : "failed") : "not run"}
            />
            <Row
              label="Patch"
              value={report.patch ? (report.patch.applied ? "applied" : "preview") : "not generated"}
            />
          </dl>
          {report.patch?.appliedDiff ? (
            <pre className="codeBlock">{report.patch.appliedDiff}</pre>
          ) : null}
        </Panel>

        <Panel title="Jira">
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
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="reportPanel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CandidateList({ candidates }: { candidates: Record<string, unknown>[] }) {
  if (candidates.length === 0) {
    return <p className="emptyText">Zero valid candidates found.</p>;
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
      <summary>AI trace</summary>
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

function statusClass(value: string) {
  if (value === "HEAL" || value === "NO_HEAL_NEEDED" || value === "completed") {
    return "positive";
  }

  if (value === "PRODUCT BUG" || value === "RUN_ERROR" || value === "failed") {
    return "negative";
  }

  return "neutral";
}
