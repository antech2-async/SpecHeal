# Architecture And Technical Proof

This file should guide the technical proof slide and speaker notes. Keep it pitch-friendly. Do not turn the deck into a code walkthrough.

## Technical Thesis

SpecHeal is a complete MVP vertical slice:

> Dashboard, Playwright runtime, OpenSpec guardrail, live OpenAI verdict, PostgreSQL audit store, Jira handoff, and Kubernetes deployment path.

## Runtime Architecture

Core components:

- Next.js app: dashboard, report pages, API routes
- ShopFlow Checkout: seeded target app under test
- Playwright runtime: executes checkout scenario and rerun proof
- OpenSpec loader: loads behavior requirement from checked-in OpenSpec files
- OpenAI verdict engine: calls `gpt-4o-mini` for structured failed-run analysis
- Proof layer: validates candidate selector, applies controlled patch, reruns patched test
- PostgreSQL: stores run history and artifacts
- Jira publisher: creates Task/Bug for actionable results
- Kubernetes manifests: deploy app and connect PostgreSQL/runtime secrets

## Data Flow

Use this simplified flow in the deck:

```text
QA Engineer
-> SpecHeal Dashboard
-> Playwright Checkout Run
-> Evidence Capture
-> OpenSpec Clause
-> OpenAI Verdict
-> Validation + Patch + Rerun Proof
-> PostgreSQL Report
-> Jira Task/Bug
```

## What Is Actually Implemented

The implementation includes:

- scenario picker for Healthy Flow, Locator Drift, Product Bug;
- run creation API and polling;
- in-process orchestration;
- real browser execution with Playwright;
- screenshot, DOM, visible text, candidate extraction;
- DOM cleaning and sensitive masking;
- OpenSpec clause loading;
- live OpenAI structured response parsing;
- no deterministic fallback when OpenAI fails;
- candidate selector validation;
- controlled Playwright test-file patch;
- patched rerun proof;
- PostgreSQL schema for runs, evidence, AI traces, validation, patch, rerun, Jira;
- Jira Cloud create issue via REST API and Atlassian Document Format;
- retry publish endpoint;
- Kubernetes manifests and secret template.

## Technical Proof Points For Slide 11

Show only the strongest proof points:

- OpenSpec is loaded into the prompt, not just written as docs.
- OpenAI uses structured schema, not free-form text.
- HEAL requires browser validation and rerun proof.
- Jira issue uses actionable mapped output.
- PostgreSQL stores full audit artifacts.
- Kubernetes deployment path exists.

## What To Avoid On Architecture Slide

Avoid:

- showing every file path;
- showing every database table;
- showing every API route;
- making C4 diagram too dense;
- explaining Next.js internals;
- overexplaining Kubernetes.

Use a simple architecture with 5-7 blocks:

1. Dashboard/API
2. Playwright Runner
3. OpenSpec
4. OpenAI
5. PostgreSQL
6. Jira
7. Kubernetes Runtime

## Suggested Architecture Slide Copy

Headline:

> Built as an end-to-end recovery workflow, not a mock dashboard.

Body:

- Playwright captures real failure evidence.
- OpenSpec anchors the behavior contract.
- OpenAI produces structured verdicts.
- Proof gates validate safe HEAL.
- PostgreSQL stores audit history.
- Jira turns decisions into engineering work.
- Kubernetes makes the MVP deployable.

## Security And Reliability Notes

Use these only if needed in speaker notes:

- OpenAI API key and Jira token are server-side only.
- Jira credentials live in environment/Kubernetes Secret.
- API tokens are not persisted to PostgreSQL or reports.
- If OpenAI fails, the run becomes an operational failure, not fake AI verdict.
- If Jira publish fails, the report remains stored and publish can be retried.

