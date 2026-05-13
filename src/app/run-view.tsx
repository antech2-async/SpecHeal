"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { formatRunDate } from "@/lib/display";
import type { AiCostBreakdown } from "@/lib/specheal/ai-cost";
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

type ReportDetailPanel = "evidence" | "patch" | "jira";

const TOKEN_PRICING_SOURCE =
  "OpenAI API pricing for gpt-4o-mini text tokens, checked 2026-05-12";

export function RunReportView({ run, artifacts, mode }: RunReportViewProps) {
  const report = run.report;
  const latestJira = artifacts?.jiraResults[0] ?? null;
  const verdictMeta = getVerdictMeta(run);
  const timeline = getDisplayTimeline(run);
  const [traceOpen, setTraceOpen] = useState(false);
  const [detailPanel, setDetailPanel] = useState<ReportDetailPanel | null>(null);

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
          <button className="reportAction" type="button" onClick={() => setTraceOpen(true)}>
            Inspect AI trace
          </button>
          {mode === "dashboard" && (run.status === "completed" || run.status === "failed") ? (
            <a className="reportAction" href={`/runs/${run.id}`}>
              Full report
            </a>
          ) : null}
        </div>
      </header>

      {mode === "dashboard" ? (
        <>
          <DashboardResultSummary jira={latestJira} run={run} />

          <section className="dashboardInspectorActions" aria-label="Inspect run details">
            <button type="button" onClick={() => setDetailPanel("evidence")}>
              <span>Inspect evidence</span>
              <strong>{getEvidenceActionLabel(run)}</strong>
            </button>
            <button type="button" onClick={() => setTraceOpen(true)}>
              <span>AI trace</span>
              <strong>{getTraceActionLabel(run, artifacts?.aiTrace ?? null)}</strong>
            </button>
            <button type="button" onClick={() => setDetailPanel("patch")}>
              <span>Patch and proof</span>
              <strong>{getProofSummary(run).value}</strong>
            </button>
            <button type="button" onClick={() => setDetailPanel("jira")}>
              <span>Jira handoff</span>
              <strong>{getJiraSummary(run, latestJira).value}</strong>
            </button>
          </section>

          <section className="dashboardTimeline" aria-label="Run timeline">
            <div className="panelActionRow">
              <span>Recovery story</span>
              <a className="textAction" href={`/runs/${run.id}`}>
                Open full report
              </a>
            </div>
            <div className="timeline compact">
              {timeline.map((event) => (
                <div className={`timelineItem ${event.status}`} key={event.key}>
                  <span />
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
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

          <ExecutiveSummary jira={latestJira} run={run} />

          <DecisionStrip jira={latestJira} run={run} />

          {run.verdict === "NO_HEAL_NEEDED" ? (
            <div className="notice successNotice">
              Healthy run persisted as an audit report. Jira publishing is not
              required by default.
            </div>
          ) : null}

          <section className="storyGrid" aria-label="Recovery story">
            <div className="timeline" aria-label="Run timeline">
              {timeline.map((event) => (
                <div className={`timelineItem ${event.status}`} key={event.key}>
                  <span />
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.detail}</p>
                    <small>{formatRunDate(event.timestamp)}</small>
                  </div>
                </div>
              ))}
            </div>
            <RunEvidenceShelf jira={latestJira} onOpenTrace={() => setTraceOpen(true)} run={run} />
          </section>

          <div className="reportSectionHeader">
            <div>
              <span>Detailed audit</span>
              <h3>Evidence, guardrails, proof, and handoff</h3>
            </div>
            <p>
              Raw prompts, DOM excerpts, and payloads stay collapsed until they
              are needed for review.
            </p>
          </div>

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
              <OpenSpecPanel clause={report.openSpec.clause} path={report.openSpec.path} />
            </Panel>

            <Panel eyebrow="03" title="Evidence">
              <EvidencePanel run={run} />
            </Panel>

            <Panel eyebrow="04" title="Decision Output">
              <DecisionOutputPanel run={run} />
            </Panel>

            <Panel eyebrow="05" title="Proof">
              <ProofPanel run={run} />
            </Panel>

            <Panel eyebrow="06" title="Jira">
              <JiraPanel jira={latestJira} run={run} />
            </Panel>
          </section>
        </>
      )}

      <RunDetailDrawer
        jira={latestJira}
        onClose={() => setDetailPanel(null)}
        openPanel={detailPanel}
        run={run}
      />

      <AiTracePanel
        aiTrace={artifacts?.aiTrace ?? null}
        onClose={() => setTraceOpen(false)}
        open={traceOpen}
        run={run}
      />
    </article>
  );
}

function DashboardResultSummary({
  jira,
  run
}: {
  jira: JiraResultArtifact | null;
  run: SerializedRun;
}) {
  const verdictMeta = getVerdictMeta(run);
  const proofSummary = getProofSummary(run);
  const jiraSummary = getJiraSummary(run, jira);
  const cards = [
    {
      detail: verdictMeta.caption,
      label: "Verdict",
      tone: verdictMeta.tone,
      value: run.verdict ?? run.status
    },
    {
      detail: run.reason ?? verdictMeta.summary,
      label: "Why",
      tone: "neutral" as const,
      value: verdictMeta.title
    },
    {
      detail: proofSummary.detail,
      label: "Proof",
      tone: proofSummary.tone,
      value: proofSummary.value
    },
    {
      detail: jiraSummary.detail,
      label: "Jira",
      tone: jiraSummary.tone,
      value: jiraSummary.value
    }
  ];

  return (
    <section className="resultSummaryGrid" aria-label="Run summary">
      {cards.map((item) => (
        <div className={`summaryCard ${item.tone}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </div>
      ))}
    </section>
  );
}

function EvidencePanel({ run }: { run: SerializedRun }) {
  const evidence = run.report.evidence;

  if (!evidence) {
    return <p className="emptyText">No failure evidence for this run.</p>;
  }

  return (
    <div className="evidenceStack">
      {evidence.screenshotBase64 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="Captured Playwright failure screenshot"
          className="evidenceImage"
          src={`data:image/png;base64,${evidence.screenshotBase64}`}
        />
      ) : null}
      <dl className="kvList">
        <Row label="Failed selector" value={evidence.failedSelector} />
        <Row label="Raw DOM" value={`${evidence.rawDomLength} chars`} />
        <Row label="Clean DOM" value={`${evidence.cleanedDomLength} chars`} />
        <Row label="Candidates" value={`${evidence.candidateCount}`} />
      </dl>
      <VisibleEvidencePanel evidence={evidence} />
      <DomAuditPanel evidence={evidence} />
      <CandidateList candidates={evidence.candidates} />
    </div>
  );
}

function DecisionOutputPanel({ run }: { run: SerializedRun }) {
  const output = run.report.output;

  if (!output) {
    return <p className="emptyText">Decision output is not ready yet.</p>;
  }

  return (
    <div className="outputPanel">
      <div className="panelActionRow">
        <span>Reviewer handoff</span>
        <CopyButton
          label="Copy summary"
          value={formatOutputForCopy(output)}
        />
      </div>
      <strong>{output.title}</strong>
      <p>{output.summary}</p>
      <p>{output.recommendedAction}</p>
      <ul>
        {output.evidence.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="notice">{output.safetyNote}</div>
    </div>
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

function ExecutiveSummary({
  jira,
  run
}: {
  jira: JiraResultArtifact | null;
  run: SerializedRun;
}) {
  const summary = getExecutiveSummary(run, jira);

  return (
    <section className="executiveSummary" aria-label="Run executive summary">
      {summary.map((item) => (
        <div className={`summaryCard ${item.tone}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </div>
      ))}
    </section>
  );
}

function OpenSpecPanel({ clause, path }: { clause: string; path: string }) {
  const highlights = getOpenSpecHighlights(clause);

  return (
    <div className="specPanel">
      <p className="pathText">{path}</p>
      <div className="specHighlights">
        {highlights.map((highlight) => (
          <div key={highlight}>
            <span>Requirement</span>
            <strong>{highlight}</strong>
          </div>
        ))}
      </div>
      <details className="rawSpec">
        <summary>View raw OpenSpec clause</summary>
        <pre className="codeBlock">{clause}</pre>
      </details>
    </div>
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

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="copyAction" type="button" onClick={copy}>
      {copied ? "Copied" : label}
    </button>
  );
}

function CopyBlock({
  className = "",
  label,
  value
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="copyBlock">
      <div className="panelActionRow">
        <span>Copy-ready artifact</span>
        <CopyButton label={label} value={value} />
      </div>
      <pre className={`codeBlock ${className}`}>{value}</pre>
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
          <div className="candidateHeader">
            <span>#{index + 1}</span>
            <strong>{String(candidate.selector ?? "unknown")}</strong>
            <em>{Number(candidate.rank ?? 0)} pts</em>
          </div>
          <span>{String(candidate.rankReason ?? "ranked candidate")}</span>
          <div className="candidateMeta">
            <small>{String(candidate.selectorKind ?? "selector")}</small>
            <small>{String(candidate.tagName ?? "element")}</small>
            <small>{candidate.enabled === false ? "disabled" : "enabled"}</small>
            <small>{candidate.visible === false ? "hidden" : "visible"}</small>
          </div>
          <LocatorChips locators={candidate.suggestedLocators} />
          <CandidateContext candidate={candidate} />
          <RankSignals signals={candidate.rankSignals} />
        </div>
      ))}
    </div>
  );
}

function LocatorChips({ locators }: { locators: unknown }) {
  const values = Array.isArray(locators) ? locators.map(String).filter(Boolean) : [];

  if (values.length === 0) {
    return null;
  }

  return (
    <div className="locatorChips" aria-label="Suggested locators">
      {values.slice(0, 5).map((locator) => (
        <code key={locator}>{locator}</code>
      ))}
    </div>
  );
}

function CandidateContext({ candidate }: { candidate: Record<string, unknown> }) {
  const facts = [
    ["Text", candidate.visibleText || candidate.text],
    ["Label", candidate.nearestLabel],
    ["Role", candidate.role],
    ["Name", candidate.name],
    ["Container", candidate.containerContext],
    ["Row", candidate.rowContext],
    ["Parent", candidate.parentContext]
  ].filter(([, value]) => typeof value === "string" && value.trim().length > 0);

  if (facts.length === 0) {
    return null;
  }

  return (
    <dl className="candidateContext">
      {facts.slice(0, 4).map(([label, value]) => (
        <div key={String(label)}>
          <dt>{String(label)}</dt>
          <dd>{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function RankSignals({ signals }: { signals: unknown }) {
  const values = Array.isArray(signals) ? signals.map(String).filter(Boolean) : [];

  if (values.length === 0) {
    return null;
  }

  return (
    <details className="rankSignals">
      <summary>Ranking signals</summary>
      <ul>
        {values.map((signal) => (
          <li key={signal}>{signal}</li>
        ))}
      </ul>
    </details>
  );
}

function VisibleEvidencePanel({
  evidence
}: {
  evidence: NonNullable<RunReport["evidence"]>;
}) {
  const visible = evidence.visibleEvidence;

  if (!visible) {
    return (
      <div className="emptyEvidence">
        <strong>Visible evidence unavailable</strong>
        <p>This older run was captured before visible evidence summaries were added.</p>
      </div>
    );
  }

  return (
    <div className="visibleEvidencePanel">
      <div className="evidenceSectionHeader">
        <span>Visible evidence</span>
        <strong>{visible.validCandidateCount} valid candidate(s)</strong>
      </div>
      <dl className="kvList">
        <Row label="Page title" value={visible.pageTitle || "n/a"} />
        <Row label="Page URL" value={visible.pageUrl || evidence.targetUrl} />
      </dl>
      {visible.paymentSectionText ? (
        <EvidenceQuote label="Payment section" value={visible.paymentSectionText} />
      ) : null}
      {visible.errorText ? <EvidenceQuote label="Error text" value={visible.errorText} /> : null}
      {visible.notes.length > 0 ? (
        <ul className="evidenceNotes">
          {visible.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      {visible.bodyText.length > 0 ? (
        <details className="rawSpec">
          <summary>Visible body text</summary>
          <pre className="codeBlock">{visible.bodyText.join("\n")}</pre>
        </details>
      ) : null}
    </div>
  );
}

function DomAuditPanel({
  evidence
}: {
  evidence: NonNullable<RunReport["evidence"]>;
}) {
  const reduction =
    evidence.rawDomLength > 0
      ? Math.round((1 - evidence.cleanedDomLength / evidence.rawDomLength) * 100)
      : 0;

  return (
    <div className="domAuditPanel">
      <div className="evidenceSectionHeader">
        <span>DOM cleaning audit</span>
        <strong>{Math.max(reduction, 0)}% smaller</strong>
      </div>
      {evidence.domNoiseSummary && evidence.domNoiseSummary.length > 0 ? (
        <div className="noiseChips" aria-label="Removed DOM noise">
          {evidence.domNoiseSummary.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : (
        <p className="emptyText">No DOM cleaning metadata was stored for this run.</p>
      )}
      {evidence.cleanedDom ? (
        <details className="rawSpec">
          <summary>Cleaned DOM excerpt</summary>
          <pre className="codeBlock">{evidence.cleanedDom}</pre>
        </details>
      ) : null}
    </div>
  );
}

function EvidenceQuote({ label, value }: { label: string; value: string }) {
  return (
    <div className="evidenceQuote">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function RunEvidenceShelf({
  jira,
  onOpenTrace,
  run
}: {
  jira: JiraResultArtifact | null;
  onOpenTrace: () => void;
  run: SerializedRun;
}) {
  const report = run.report;
  const screenshot = report.evidence?.screenshotBase64;
  const proofLabel = report.rerun?.passed
    ? "Rerun passed"
    : report.validation?.passed
      ? "Candidate validated"
      : report.playwright?.passed
        ? "Baseline passed"
        : "Awaiting proof";

  return (
    <aside className="evidenceShelf" aria-label="Evidence summary">
      <div>
        <span>Proof</span>
        <strong>{proofLabel}</strong>
        <p>{getDecisionSummary(run, jira)}</p>
      </div>

      {screenshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="Captured Playwright failure screenshot"
          className="shelfImage"
          src={`data:image/png;base64,${screenshot}`}
        />
      ) : (
        <div className="shelfEmpty">
          <strong>No failure screenshot</strong>
          <p>Healthy runs skip evidence capture after the baseline succeeds.</p>
        </div>
      )}

      <dl className="kvList">
        <Row label="OpenSpec" value={report.openSpec.path} />
        <Row label="Candidate" value={run.candidateSelector ?? "none"} />
        <Row
          label="Evidence"
          value={
            report.evidence
              ? `${report.evidence.cleanedDomLength} cleaned chars, ${report.evidence.candidateCount} candidate(s)`
              : "baseline only"
          }
        />
        <Row
          label="Jira"
          value={jira?.issueKey ?? jira?.status ?? (run.verdict === "NO_HEAL_NEEDED" ? "not required" : "pending")}
        />
      </dl>

      {jira?.issueUrl ? (
        <a className="reportAction" href={jira.issueUrl} rel="noreferrer" target="_blank">
          Open Jira
        </a>
      ) : null}
      <button className="reportAction" type="button" onClick={onOpenTrace}>
        Inspect AI trace
      </button>
    </aside>
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
          detail={
            report.patch?.explanation ??
            (report.rerun?.passed === false
              ? "Patch preview is blocked because rerun proof did not reach the required success state."
              : "Patch preview appears only after validation and rerun pass.")
          }
          label="Patch"
          tone={report.patch?.applied ? "positive" : report.rerun?.passed === false ? "negative" : "neutral"}
          value={
            report.patch
              ? report.patch.applied
                ? "Applied in runtime"
                : "Preview"
              : report.rerun?.passed === false
                ? "Blocked"
                : "Waiting"
          }
        />
        {report.patch?.appliedDiff ? (
          <CopyBlock
            className="proofDiff"
            label="Copy patch"
            value={report.patch.appliedDiff}
          />
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
      <CopyBlock
        label="Copy Jira context"
        value={[
          `Jira status: ${result.status}`,
          result.issueType ? `Issue type: ${result.issueType}` : null,
          result.issueKey ? `Issue: ${result.issueKey}` : null,
          result.issueUrl ? `URL: ${result.issueUrl}` : null,
          result.payloadSummary ? `Payload: ${result.payloadSummary}` : null,
          result.errorMessage ? `Error: ${result.errorMessage}` : null
        ]
          .filter(Boolean)
          .join("\n")}
      />
      {result.errorMessage ? <p className="inlineError">{result.errorMessage}</p> : null}
      {result.status === "jira_publish_failed" ? (
        <button className="secondaryAction" disabled={retrying} type="button" onClick={retry}>
          {retrying ? "Retrying" : "Retry Jira publish"}
        </button>
      ) : null}
    </div>
  );
}

function RunDetailDrawer({
  jira,
  onClose,
  openPanel,
  run
}: {
  jira: JiraResultArtifact | null;
  onClose: () => void;
  openPanel: ReportDetailPanel | null;
  run: SerializedRun;
}) {
  useEffect(() => {
    if (!openPanel) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, openPanel]);

  if (!openPanel) {
    return null;
  }

  const config = getDetailPanelConfig(openPanel);

  return (
    <div className="traceOverlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={config.title}
        aria-modal="true"
        className="traceDrawer detailDrawer"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="traceHeader">
          <div>
            <p className="eyebrow">{config.eyebrow}</p>
            <span>{config.title}</span>
            <small>{config.summary}</small>
          </div>
          <button aria-label="Close detail drawer" className="traceClose" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        {openPanel === "evidence" ? <EvidencePanel run={run} /> : null}
        {openPanel === "patch" ? (
          <div className="drawerStack">
            <ProofPanel run={run} />
            <DecisionOutputPanel run={run} />
          </div>
        ) : null}
        {openPanel === "jira" ? (
          <div className="drawerStack">
            <JiraPanel jira={jira} run={run} />
            <DecisionOutputPanel run={run} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function getDetailPanelConfig(panel: ReportDetailPanel) {
  if (panel === "evidence") {
    return {
      eyebrow: "Evidence",
      summary: "Failure screenshot, visible page facts, cleaned DOM audit, and ranked candidate selectors.",
      title: "Inspect captured evidence"
    };
  }

  if (panel === "patch") {
    return {
      eyebrow: "Proof",
      summary: "Validation, rerun, patch safety, and reviewer-ready output for this run.",
      title: "Patch and proof"
    };
  }

  return {
    eyebrow: "Jira",
    summary: "Publishing state, payload summary, retry controls, and reviewer handoff.",
    title: "Jira handoff"
  };
}

function AiTracePanel({
  aiTrace,
  onClose,
  open,
  run
}: {
  aiTrace: AiTraceArtifact | null;
  onClose: () => void;
  open: boolean;
  run: SerializedRun;
}) {
  const reportAi = run.report.ai;
  const [activeTab, setActiveTab] = useState<"summary" | "prompt" | "response" | "proof">("summary");

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="traceOverlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-label="AI trace audit"
        aria-modal="true"
        className="traceDrawer"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="traceHeader">
          <div>
            <p className="eyebrow">AI trace</p>
            <span>Recovery decision audit</span>
            <small>
              {aiTrace
                ? "Prompt, raw response, parsed verdict, usage, and cost"
                : run.verdict === "NO_HEAL_NEEDED"
                  ? "Skipped because the baseline passed"
                  : "Unavailable for this run"}
            </small>
          </div>
          <button aria-label="Close AI trace" className="traceClose" type="button" onClick={onClose}>
            Close
          </button>
        </header>
      {aiTrace ? (
        <div>
          <div className="traceTabs" role="tablist" aria-label="AI trace sections">
            {[
              ["summary", "Summary"],
              ["prompt", "Prompt"],
              ["response", "Response"],
              ["proof", "Proof"]
            ].map(([id, label]) => (
              <button
                aria-selected={activeTab === id}
                className={activeTab === id ? "active" : ""}
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                role="tab"
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "summary" ? (
            <div className="traceGrid">
              <CostCounter aiTrace={aiTrace} run={run} />
              <pre className="codeBlock">
                {JSON.stringify(aiTrace.parsedResponse ?? run.report.ai ?? {}, null, 2)}
              </pre>
            </div>
          ) : null}

          {activeTab === "prompt" ? (
            <div className="traceGrid">
              <Panel eyebrow="System" title="System Prompt">
                <pre className="codeBlock">{aiTrace.systemPrompt}</pre>
              </Panel>
              <Panel eyebrow="User" title="User Prompt">
                <pre className="codeBlock">{aiTrace.userPrompt}</pre>
              </Panel>
            </div>
          ) : null}

          {activeTab === "response" ? (
            <div className="traceGrid">
              <Panel eyebrow="Raw" title="Raw Response">
                <pre className="codeBlock">
                  {aiTrace.rawResponse ?? "No raw response stored."}
                </pre>
              </Panel>
              <Panel eyebrow="Parsed" title="Parsed Response">
                <pre className="codeBlock">
                  {JSON.stringify(aiTrace.parsedResponse ?? {}, null, 2)}
                </pre>
              </Panel>
            </div>
          ) : null}

          {activeTab === "proof" ? (
            <div className="traceGrid">
              <Panel eyebrow="Validation" title="Browser Validation">
                <pre className="codeBlock">
                  {JSON.stringify(run.report.validation ?? { status: "not run" }, null, 2)}
                </pre>
              </Panel>
              <Panel eyebrow="Rerun" title="Patch and Rerun">
                <pre className="codeBlock">
                  {JSON.stringify(
                    {
                      patch:
                        run.report.patch ??
                        (run.report.rerun?.passed === false
                          ? "blocked until rerun proof passes"
                          : "not generated"),
                      rerun: run.report.rerun ?? "not run"
                    },
                    null,
                    2
                  )}
                </pre>
              </Panel>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="emptyText">
          {reportAi?.status === "failed"
            ? reportAi.errorMessage
            : "AI recovery was skipped or has not run yet."}
        </p>
      )}
      </section>
    </div>
  );
}

function CostCounter({
  aiTrace,
  run
}: {
  aiTrace: AiTraceArtifact;
  run: SerializedRun;
}) {
  const reportAi = run.report.ai;
  const cost = reportAi?.costBreakdown;
  const cachedPromptTokens = reportAi?.cachedPromptTokens ?? cost?.cachedInputTokens;
  const estimatedCost =
    reportAi?.estimatedCostUsd ?? cost?.estimatedCostUsd ?? aiTrace.estimatedCostUsd;

  return (
    <div className="tokenCounter">
      <div className="evidenceSectionHeader">
        <span>Token and cost counter</span>
        <strong>{formatUsdCost(estimatedCost)}</strong>
      </div>
      <dl className="kvList">
        <Row label="Model" value={aiTrace.model} />
        <Row label="Prompt tokens" value={formatMaybeNumber(aiTrace.promptTokens)} />
        <Row label="Cached prompt tokens" value={formatMaybeNumber(cachedPromptTokens)} />
        <Row label="Completion tokens" value={formatMaybeNumber(aiTrace.completionTokens)} />
        <Row label="Total tokens" value={formatMaybeNumber(aiTrace.totalTokens)} />
        <Row label="Duration" value={aiTrace.durationMs == null ? "n/a" : `${aiTrace.durationMs} ms`} />
        {aiTrace.errorMessage ? <Row label="AI error" value={aiTrace.errorMessage} /> : null}
      </dl>
      <CostBreakdown cost={cost} fallbackCost={aiTrace.estimatedCostUsd} />
    </div>
  );
}

function CostBreakdown({
  cost,
  fallbackCost
}: {
  cost?: AiCostBreakdown;
  fallbackCost: number | null;
}) {
  if (!cost) {
    return (
      <div className="costBreakdown">
        <CostPart label="Estimated total" value={formatUsdCost(fallbackCost)} />
        <p>
          Detailed cached-token breakdown is unavailable for this stored trace. The
          total remains an estimate from OpenAI token usage.
        </p>
        <small>{TOKEN_PRICING_SOURCE}</small>
      </div>
    );
  }

  return (
    <div className="costBreakdown">
      <CostPart label="Input" value={formatUsdCost(cost.inputCostUsd)} />
      <CostPart label="Cached input" value={formatUsdCost(cost.cachedInputCostUsd)} />
      <CostPart label="Output" value={formatUsdCost(cost.outputCostUsd)} />
      <p>{cost.note}</p>
      <small>
        {cost.pricingSource}. Rates: input ${cost.rates.inputPerMillion}/1M,
        cached ${cost.rates.cachedInputPerMillion}/1M, output $
        {cost.rates.outputPerMillion}/1M.
      </small>
    </div>
  );
}

function CostPart({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

function getEvidenceActionLabel(run: SerializedRun) {
  const evidence = run.report.evidence;

  if (!evidence) {
    return run.report.playwright?.passed ? "Baseline passed" : "No evidence yet";
  }

  return `${evidence.candidateCount} candidate${
    evidence.candidateCount === 1 ? "" : "s"
  }`;
}

function getTraceActionLabel(run: SerializedRun, aiTrace: AiTraceArtifact | null) {
  if (aiTrace) {
    return aiTrace.totalTokens == null
      ? aiTrace.model
      : `${formatMaybeNumber(aiTrace.totalTokens)} tokens`;
  }

  if (run.verdict === "NO_HEAL_NEEDED") {
    return "Skipped by baseline";
  }

  return "Open audit";
}

function getProofSummary(run: SerializedRun) {
  const report = run.report;

  if (run.verdict === "HEAL") {
    if (report.rerun?.passed) {
      return {
        detail: `Patched test reached ${report.rerun.expectedText}.`,
        tone: "positive" as const,
        value: "Rerun passed"
      };
    }

    if (report.validation?.passed) {
      return {
        detail: `Candidate ${report.validation.selector} matched and was clickable.`,
        tone: "positive" as const,
        value: "Candidate validated"
      };
    }

    return {
      detail: "SpecHeal is waiting for browser validation and rerun proof.",
      tone: "neutral" as const,
      value: "Proof pending"
    };
  }

  if (run.verdict === "PRODUCT BUG") {
    return {
      detail: "OpenSpec-required behavior is unavailable, so selector healing is blocked.",
      tone: "negative" as const,
      value: "Patch blocked"
    };
  }

  if (run.verdict === "NO_HEAL_NEEDED") {
    return {
      detail: "The original Playwright selector reached Payment Success.",
      tone: "positive" as const,
      value: "Baseline passed"
    };
  }

  if (run.verdict === "SPEC OUTDATED") {
    return {
      detail: "The test/spec mapping needs human review before a safe patch.",
      tone: "warning" as const,
      value: "Review required"
    };
  }

  if (run.verdict === "RUN_ERROR" || run.status === "failed") {
    return {
      detail: run.errorMessage ?? "The run stopped before trusted proof was produced.",
      tone: "negative" as const,
      value: "Run failed"
    };
  }

  return {
    detail: "SpecHeal is still collecting run evidence.",
    tone: "neutral" as const,
    value: "Pending"
  };
}

function getJiraSummary(run: SerializedRun, jira: JiraResultArtifact | null) {
  if (jira?.issueKey) {
    return {
      detail: jira.issueUrl ?? jira.payloadSummary ?? "Issue created for this recovery outcome.",
      tone: "positive" as const,
      value: jira.issueKey
    };
  }

  if (jira?.status === "jira_publish_failed") {
    return {
      detail: jira.errorMessage ?? "Publishing failed and can be retried from the Jira panel.",
      tone: "negative" as const,
      value: "Publish failed"
    };
  }

  if (jira?.status) {
    return {
      detail: jira.payloadSummary ?? "Jira publishing state was persisted with this run.",
      tone: jira.status === "not_required" ? "neutral" as const : "warning" as const,
      value: jira.status
    };
  }

  if (run.verdict === "NO_HEAL_NEEDED") {
    return {
      detail: "Healthy audit runs do not create Jira issues by default.",
      tone: "neutral" as const,
      value: "Not required"
    };
  }

  if (run.status === "completed" || run.status === "failed") {
    return {
      detail: "Actionable outcomes should publish or expose retry context.",
      tone: "warning" as const,
      value: "Check handoff"
    };
  }

  return {
    detail: "Jira status will appear after the run reaches a terminal outcome.",
    tone: "neutral" as const,
    value: "Pending"
  };
}

function getDisplayTimeline(run: SerializedRun): RunTimelineEvent[] {
  const timeline = settleHistoricalTimeline(run.report.timeline);

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

function settleHistoricalTimeline(timeline: RunTimelineEvent[]): RunTimelineEvent[] {
  return timeline.map((event, index) => {
    const hasLaterEvent = index < timeline.length - 1;

    if (hasLaterEvent && (event.status === "running" || event.status === "pending")) {
      return {
        ...event,
        status: "completed"
      };
    }

    return event;
  });
}

function cleanDisplayText(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "").trim();
}

function formatMaybeNumber(value: number | null | undefined) {
  return value == null ? "n/a" : value.toLocaleString("en-US");
}

function formatUsdCost(value: number | null | undefined) {
  if (value == null) {
    return "n/a";
  }

  if (value > 0 && value < 0.000001) {
    return "<$0.000001";
  }

  return `$${value.toFixed(6)}`;
}

function formatOutputForCopy(output: NonNullable<RunReport["output"]>) {
  return [
    output.title,
    "",
    `Summary: ${output.summary}`,
    `Recommended action: ${output.recommendedAction}`,
    "",
    "Evidence:",
    ...output.evidence.map((item) => `- ${item}`),
    "",
    `Safety note: ${output.safetyNote}`
  ].join("\n");
}

function getOpenSpecHighlights(clause: string) {
  const requirements = clause
    .split("\n")
    .filter((line) => line.startsWith("### Requirement: "))
    .map((line) => line.replace("### Requirement: ", "").trim())
    .filter(Boolean);

  return requirements.slice(0, 4);
}

function getExecutiveSummary(run: SerializedRun, jira: JiraResultArtifact | null) {
  const report = run.report;
  const failedSelector = report.evidence?.failedSelector ?? run.baselineSelector ?? "#pay-now";
  const candidate = run.candidateSelector ?? report.validation?.selector ?? "no safe candidate";
  const jiraValue = jira?.issueKey ?? jira?.status ?? "not published";

  if (run.verdict === "HEAL") {
    return [
      {
        detail: `Baseline failed at ${failedSelector}, but checkout behavior still exists.`,
        label: "Failure type",
        tone: "neutral",
        value: "Locator drift"
      },
      {
        detail: `Validated ${candidate} in the browser, then reran the patched Playwright test.`,
        label: "Trust proof",
        tone: "positive",
        value: "Validation + rerun passed"
      },
      {
        detail: `Review the generated test patch and Jira Task ${jiraValue}.`,
        label: "Next action",
        tone: "positive",
        value: "Apply patch through review"
      }
    ] as const;
  }

  if (run.verdict === "PRODUCT BUG") {
    return [
      {
        detail: `Baseline failed at ${failedSelector} and no valid payment action was available.`,
        label: "Failure type",
        tone: "negative",
        value: "Product behavior missing"
      },
      {
        detail: "OpenSpec requires an enabled payment action, so healing the selector would hide the bug.",
        label: "Guardrail",
        tone: "negative",
        value: "Patch blocked"
      },
      {
        detail: `Fix the checkout payment behavior from Jira Bug ${jiraValue}.`,
        label: "Next action",
        tone: "negative",
        value: "Escalate product bug"
      }
    ] as const;
  }

  if (run.verdict === "NO_HEAL_NEEDED") {
    return [
      {
        detail: "The original Playwright path reached Payment Success.",
        label: "Failure type",
        tone: "positive",
        value: "No failure"
      },
      {
        detail: "AI recovery, validation, patch, and rerun are intentionally skipped.",
        label: "Guardrail",
        tone: "neutral",
        value: "Report-only audit"
      },
      {
        detail: "Keep this run as evidence that the checkout baseline is healthy.",
        label: "Next action",
        tone: "positive",
        value: "No Jira required"
      }
    ] as const;
  }

  if (run.verdict === "SPEC OUTDATED") {
    return [
      {
        detail: "The current test/spec mapping no longer explains the intended behavior.",
        label: "Failure type",
        tone: "warning",
        value: "Spec alignment issue"
      },
      {
        detail: "SpecHeal blocks locator patching until the requirement is reviewed.",
        label: "Guardrail",
        tone: "warning",
        value: "Human review required"
      },
      {
        detail: `Use Jira Task ${jiraValue} to update the spec or test mapping.`,
        label: "Next action",
        tone: "warning",
        value: "Review requirements"
      }
    ] as const;
  }

  return [
    {
      detail: run.errorMessage ?? "The run is still pending or stopped before a trusted result.",
      label: "Status",
      tone: run.status === "failed" ? "negative" : "neutral",
      value: run.status
    },
    {
      detail: run.failedStage ?? "SpecHeal has not produced a terminal verdict yet.",
      label: "Stage",
      tone: "neutral",
      value: run.failedStage ?? "waiting"
    },
    {
      detail: "Resolve the runtime issue, then retry the scenario.",
      label: "Next action",
      tone: "neutral",
      value: "Investigate"
    }
  ] as const;
}
