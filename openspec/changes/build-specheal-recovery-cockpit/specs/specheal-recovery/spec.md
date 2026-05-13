## ADDED Requirements

### Requirement: Recovery cockpit dashboard
The system SHALL provide a dashboard for running and reviewing SpecHeal recovery scenarios.

#### Scenario: Dashboard shows active demo project
- **WHEN** a user opens the SpecHeal dashboard
- **THEN** the dashboard displays ShopFlow Checkout as the active project
- **AND** the dashboard displays OpenSpec, Playwright, OpenAI, Jira, and database readiness status

#### Scenario: Dashboard exposes primary run action
- **WHEN** the dashboard is ready
- **THEN** the user can choose a scenario and start a SpecHeal run from the main screen

### Requirement: Scenario-based recovery run
The system SHALL run recovery from a known scenario identifier for the MVP demo.

#### Scenario: User starts selected scenario
- **WHEN** the user starts a run for a selected scenario
- **THEN** the system creates a run record with the selected scenario, initial status, target project, and start timestamp

#### Scenario: Scenario controls ShopFlow target state
- **WHEN** a run starts
- **THEN** the Playwright target URL uses the ShopFlow state associated with the selected scenario

### Requirement: Playwright runtime execution
The system SHALL execute the checkout test in a real browser runtime using Playwright.

#### Scenario: Baseline test execution
- **WHEN** a run begins
- **THEN** Playwright opens the ShopFlow target, performs the configured checkout action, and waits for `Payment Success`

#### Scenario: Execution result is recorded
- **WHEN** the Playwright attempt finishes
- **THEN** the run records pass/fail status, target URL, selector used, test name, step name, error if any, and execution duration

### Requirement: No heal needed classification
The system SHALL classify successful baseline execution as `NO_HEAL_NEEDED`.

#### Scenario: Baseline run passes
- **WHEN** the first Playwright attempt reaches `Payment Success`
- **THEN** the run verdict is `NO_HEAL_NEEDED`
- **AND** the system skips OpenAI recovery analysis for that run

#### Scenario: Successful run still reaches terminal workflow
- **WHEN** a run is classified as `NO_HEAL_NEEDED`
- **THEN** the run becomes terminal
- **AND** the run is persisted as an audit report
- **AND** the system does not create a Jira issue for the healthy result by default

### Requirement: Failure evidence capture
The system SHALL capture structured evidence when the Playwright attempt fails.

#### Scenario: Failed run captures evidence
- **WHEN** the first Playwright attempt fails
- **THEN** the system captures the Playwright error, failed selector, target URL, screenshot, DOM evidence, visible page evidence, and candidate elements

#### Scenario: Screenshot evidence is base64
- **WHEN** screenshot evidence is captured
- **THEN** the screenshot is encoded as a base64 PNG string for MVP storage

#### Scenario: Evidence is stored with run report
- **WHEN** failure evidence is captured
- **THEN** the evidence is attached to the run report for dashboard display and audit

### Requirement: DOM cleaning and sensitive data masking
The system SHALL clean DOM evidence and mask sensitive values before sending evidence to OpenAI.

#### Scenario: Framework noise is removed
- **WHEN** the system prepares DOM evidence for AI analysis
- **THEN** doctype, head, script, style, meta, link, noscript, comments, SVG, iframe, canvas, template, and HTML/body shell noise are removed
- **AND** presentation or framework attributes such as class, inline style, Next.js data attributes, and React root attributes are removed from the cleaned DOM

#### Scenario: Sensitive values are masked
- **WHEN** DOM evidence contains input values or email-like text
- **THEN** the system masks those values before including the evidence in the prompt or report

#### Scenario: DOM audit metadata is retained
- **WHEN** DOM evidence is cleaned
- **THEN** raw DOM length, cleaned DOM length, cleaned DOM excerpt, and removed DOM noise summary are recorded in the run report
- **AND** the removed DOM noise summary includes removed tags and removed attributes when applicable

### Requirement: Candidate extraction and ranking
The system SHALL extract and rank valid candidate elements for recovery.

#### Scenario: Candidate extraction is body-scoped
- **WHEN** the system extracts click candidates
- **THEN** candidates are extracted from the document body rather than head metadata or framework shell nodes

#### Scenario: Candidate must be actionable
- **WHEN** a click candidate is ranked
- **THEN** the candidate is visible, enabled, and interactive or has a stable locator attribute

#### Scenario: No candidate state is explicit
- **WHEN** no valid candidate exists
- **THEN** the report states that zero valid candidates were found

### Requirement: OpenSpec source loading
The system SHALL load the relevant OpenSpec requirement text for each recovery analysis.

#### Scenario: OpenSpec clause is included in analysis
- **WHEN** a failed run requires recovery analysis
- **THEN** the system includes the relevant ShopFlow Checkout OpenSpec clause in the OpenAI prompt

#### Scenario: OpenSpec clause is displayed in report
- **WHEN** the run report is displayed
- **THEN** the report shows the OpenSpec clause used as the source of truth

### Requirement: Live OpenAI verdict
The system SHALL use live OpenAI calls to produce recovery verdicts for failed runs.

#### Scenario: Failed run invokes OpenAI
- **WHEN** a Playwright run fails and evidence is available
- **THEN** the system calls OpenAI model `gpt-4o-mini` with structured failure evidence, candidate context, and OpenSpec context
- **AND** the model can be overridden only through server-side configuration

#### Scenario: OpenAI returns structured verdict
- **WHEN** OpenAI returns a response
- **THEN** the response is parsed into verdict, reason, confidence, candidate selector if any, patch object if any, and Jira-ready report object if any

#### Scenario: Demo does not silently fallback
- **WHEN** OpenAI is unavailable, returns invalid output, or cannot be parsed
- **THEN** the run records a clear AI failure state instead of silently substituting a deterministic or precomputed verdict
- **AND** the report shows the recovery analysis did not produce a trusted AI verdict

### Requirement: Run verdict set
The system SHALL support `NO_HEAL_NEEDED`, `HEAL`, `PRODUCT BUG`, `SPEC OUTDATED`, and `RUN_ERROR` as persisted terminal run verdicts.

#### Scenario: OpenAI recovery verdicts are bounded
- **WHEN** a failed run reaches live OpenAI recovery analysis
- **THEN** OpenAI can return only `HEAL`, `PRODUCT BUG`, or `SPEC OUTDATED` as recovery verdicts

#### Scenario: Orchestrator terminal verdicts are explicit
- **WHEN** baseline execution succeeds or an operational error prevents trusted recovery analysis
- **THEN** the orchestrator can set `NO_HEAL_NEEDED` or `RUN_ERROR` as the terminal run verdict without presenting it as an OpenAI recovery verdict

#### Scenario: HEAL verdict
- **WHEN** evidence shows locator drift while OpenSpec behavior remains satisfied
- **THEN** the system can classify the run as `HEAL`

#### Scenario: PRODUCT BUG verdict
- **WHEN** evidence shows required OpenSpec behavior is missing or unavailable
- **THEN** the system can classify the run as `PRODUCT BUG`

#### Scenario: SPEC OUTDATED verdict
- **WHEN** evidence shows the test flow no longer matches the current intended behavior and selector replacement is insufficient
- **THEN** the system can classify the run as `SPEC OUTDATED`

### Requirement: HEAL candidate validation
The system SHALL validate a `HEAL` candidate selector in the browser before treating it as safe.

#### Scenario: Candidate selector validation passes
- **WHEN** OpenAI returns a candidate selector for `HEAL`
- **THEN** the system verifies that the selector matches exactly one visible and enabled element that can accept the intended action

#### Scenario: Candidate validation fails
- **WHEN** the candidate selector is missing, ambiguous, hidden, disabled, or not actionable
- **THEN** the system does not mark the patch as safe

### Requirement: Rerun proof
The system SHALL rerun the checkout test through the patched Playwright test file before presenting a safe patch.

#### Scenario: Rerun proves recovered behavior
- **WHEN** candidate validation passes and the HEAL patch has been applied to the target test file
- **THEN** the system reruns the checkout test from the patched file and requires `Payment Success`

#### Scenario: Rerun blocks unsafe patch
- **WHEN** rerun does not reach `Payment Success`
- **THEN** the system does not present the patch as a safe heal

### Requirement: Test-file patch application and preview
The system SHALL apply and display a reviewable Playwright test locator patch for safe `HEAL` results.

#### Scenario: Safe heal patch is applied before proof
- **WHEN** browser validation passes for a `HEAL` candidate selector
- **THEN** the system applies the locator patch to the target Playwright test file in the runtime workspace
- **AND** the applied patch only changes the test locator needed for the failed step

#### Scenario: Safe heal patch is shown
- **WHEN** validation, patch application, and rerun proof pass for a `HEAL` verdict
- **THEN** the report displays target file, old line, new line, applied diff, and explanation

#### Scenario: Patch is not committed automatically
- **WHEN** an applied patch preview is generated
- **THEN** the system does not auto-commit, auto-merge, or create a GitHub pull request as part of the MVP

#### Scenario: Patch targets the test, not product code
- **WHEN** the system presents a safe `HEAL` patch
- **THEN** the patch is presented as an applied Playwright test locator update that remains reviewable
- **AND** the system does not claim to repair product implementation code

### Requirement: Product bug report output
The system SHALL generate a structured product bug report when recovery is not safe because required behavior is missing.

#### Scenario: Product bug report is generated
- **WHEN** the final verdict is `PRODUCT BUG`
- **THEN** the report includes title, summary, evidence, OpenSpec reference, AI reason, and recommended action

#### Scenario: Product bug report does not include safe patch
- **WHEN** the final verdict is `PRODUCT BUG`
- **THEN** the report does not present any selector patch as the recommended action

#### Scenario: Product bug remains an escalation
- **WHEN** the final verdict is `PRODUCT BUG`
- **THEN** the report recommends fixing the product behavior or updating OpenSpec if the behavior intentionally changed
- **AND** the system does not claim to automatically fix the product bug

### Requirement: Run timeline report
The system SHALL display every run as a timeline report.

#### Scenario: Timeline shows recovery steps
- **WHEN** a run reaches a terminal state
- **THEN** the dashboard shows Playwright result, evidence, OpenSpec clause, OpenAI verdict, proof or bug decision, and Jira publish result when applicable

#### Scenario: Timeline handles healthy runs
- **WHEN** a run is `NO_HEAL_NEEDED`
- **THEN** the timeline marks AI recovery, candidate validation, and rerun proof as skipped or not needed
- **AND** the timeline marks Jira publishing as not required by default

### Requirement: AI trace transparency
The system SHALL expose the trace needed to audit an AI-assisted decision.

#### Scenario: Trace shows prompt and response
- **WHEN** a run uses OpenAI
- **THEN** the report shows system prompt, user prompt, raw response, and parsed response

#### Scenario: Trace distinguishes unavailable AI
- **WHEN** OpenAI is not configured or fails before returning a trusted response
- **THEN** the report shows the failed AI stage and error context
- **AND** the report does not present a hardcoded replacement verdict as an AI decision

#### Scenario: Trace labels confidence correctly
- **WHEN** the report displays confidence
- **THEN** the value is labeled as AI confidence rather than runtime certainty

#### Scenario: Trace shows token metadata when available
- **WHEN** OpenAI usage metadata is available
- **THEN** the report shows prompt tokens, completion tokens, total tokens, and estimated cost

### Requirement: PostgreSQL run persistence
The system SHALL persist run history and audit artifacts in PostgreSQL.

#### Scenario: Run metadata is stored
- **WHEN** a run is created or updated
- **THEN** scenario, status, verdict, reason, confidence, timestamps, and terminal result are stored

#### Scenario: Run artifacts are stored
- **WHEN** evidence, AI trace, applied patch preview, validation result, rerun result, or Jira publish result is produced
- **THEN** the artifact is stored with the run

#### Scenario: Screenshot artifact is stored in PostgreSQL
- **WHEN** a screenshot is captured for a run
- **THEN** the base64 screenshot is stored as part of the PostgreSQL-backed run artifact

#### Scenario: Recent runs are visible
- **WHEN** the dashboard loads
- **THEN** recent runs can be listed from persisted data

### Requirement: Full report access
The system SHALL provide a full report view for each persisted run.

#### Scenario: User opens full report
- **WHEN** a user opens a run report by ID
- **THEN** the system displays run overview, timeline, evidence, OpenSpec clause, AI trace, proof details, and Jira publish result when applicable

#### Scenario: Incomplete run report is handled
- **WHEN** a run exists but is not complete
- **THEN** the report page displays the current status rather than failing silently

### Requirement: Terminal run error handling
The system SHALL record operational errors as terminal run results when a recovery run cannot complete.

#### Scenario: Runtime error is recorded
- **WHEN** Playwright, OpenAI, persistence, or orchestration fails in a way that stops the run
- **THEN** the run records verdict `RUN_ERROR`, error status, error message, and failed stage

#### Scenario: Runtime error remains publishable
- **WHEN** a run ends in an operational error
- **THEN** the run remains eligible for Jira publishing as an operational follow-up when Jira is configured

### Requirement: Kubernetes deployment readiness
The system SHALL be deployable as runtime artifacts on Kubernetes.

#### Scenario: MVP uses one app container
- **WHEN** the MVP is deployed to Kubernetes
- **THEN** dashboard, API/backend routes, in-process Playwright runner, OpenAI verdict generation, and Jira publishing run from one app container
- **AND** PostgreSQL is deployed or connected as a separate service

#### Scenario: Runtime configuration uses secrets
- **WHEN** the system is deployed to Kubernetes
- **THEN** OpenAI, Jira, database, and runtime secrets are provided through server-side environment or Kubernetes Secret

#### Scenario: App container supports Playwright
- **WHEN** the app container runs in Kubernetes
- **THEN** Playwright browser dependencies are available for execution

#### Scenario: Dashboard is exposed to judge
- **WHEN** the Kubernetes deployment is ready
- **THEN** a service or ingress exposes the SpecHeal dashboard URL
