# SpecHeal Project Memory

This repository is the from-zero hackathon build for **SpecHeal**.

The goal of this file is to give incoming agents and collaborators enough project context before OpenSpec artifacts and application code exist. Treat this as working memory, not as the final specification.

## Event Context

- Event: Refactory Hackathon 2026, Telkom round, May 12-13, 2026.
- Challenge theme: Engineering Productivity x AI.
- Required direction: build a real end-to-end AI-powered software engineering productivity product.
- Required foundations from the event brief: OpenSpec, LLMs, Kubernetes/deployment, and PostgreSQL.
- Judging emphasis: innovation, impact, technical execution, UX/design, and clear presentation.
- Important rule: all hackathon project code must be developed during the hackathon. Do not copy pre-existing non-open-source project code into this repo.

## Product Thesis

SpecHeal is an AI-assisted recovery cockpit for Playwright UI test failures.

It helps QA and engineering teams answer:

> When a UI test fails, should we heal the test, or is the product actually broken?

Core thesis:

> SpecHeal is not just making tests green. SpecHeal makes test recovery trustworthy.

In Indonesian:

> SpecHeal bukan sekadar membuat test hijau. SpecHeal membuat recovery test bisa dipercaya.

## Problem

UI automation tests often fail because selectors or DOM structure drift, even when the user-facing product behavior is still correct.

Example:

```ts
await page.click("#pay-now");
```

The product refactors the button to:

```html
<button data-testid="complete-payment">Pay Now</button>
```

The checkout still works for users, but CI turns red because the old locator no longer matches.

The harder problem: blind self-healing can create a false green. A test can pass after the AI picks some replacement selector, while the product requirement is actually broken.

## Solution Shape

SpecHeal should recover failed Playwright UI tests safely:

```text
Playwright failure
-> evidence capture
-> OpenSpec requirement lookup
-> AI-assisted verdict
-> browser candidate validation
-> controlled test-file patch when HEAL is safe
-> rerun proof
-> reviewable patch or Jira-ready bug report
```

Short mechanism line:

```text
AI proposes. OpenSpec guards. Browser validates. Rerun proves.
```

## MVP Demo Product

The hackathon demo should be intentionally narrow and polished.

Seeded tested app: **ShopFlow Checkout**

User flow:

```text
cart -> checkout -> pay -> Payment Success
```

Main scenarios:

- Healthy Flow: the original Playwright selector still works, so verdict is `NO_HEAL_NEEDED`.
- Locator Drift: the old selector fails, but the payment action still exists under a new stable selector, so verdict is `HEAL`.
- Product Bug: the required payment action is missing/unavailable, so verdict is `PRODUCT BUG` and no patch is generated.

Expected HEAL patch example:

```diff
- await page.click("#pay-now");
+ await page.getByTestId("complete-payment").click();
```

For MVP, a `HEAL` result should apply the locator patch to the target Playwright test file in a controlled runtime/workspace path before rerun proof. The system must still avoid auto-commit, auto-merge, or product-code edits.

Expected product bug output:

```text
Title: Checkout payment action missing from ShopFlow checkout
Summary: The checkout payment test failed because the payment action required by OpenSpec is missing or unavailable.
Recommended action: Restore the payment CTA or update the ShopFlow OpenSpec if the checkout flow intentionally changed.
```

## OpenSpec Direction

OpenSpec artifacts now exist in this repo under:

- `openspec/config.yaml`
- `openspec/changes/build-specheal-recovery-cockpit/`

Treat the active OpenSpec change as the implementation contract until it is revised or archived.

OpenSpec is organized into three capabilities:

- `shopflow-checkout`: product behavior of the tiny checkout app under test.
- `specheal-recovery`: behavior of SpecHeal itself as a safe recovery product.
- `jira-integration`: behavior of the Jira workflow handoff for actionable run results.

ShopFlow product OpenSpec should be selector-agnostic:

- It should define payment completion behavior.
- It should say a payment action must be visible and enabled when payment is available.
- It should say the product requirement is not satisfied if no valid payment action exists.
- It should not mention `#pay-now`, `data-testid`, Playwright, or healing internals.

SpecHeal recovery OpenSpec defines:

- seeded demo project and scenario picker,
- failure evidence capture,
- cleaned DOM evidence,
- candidate selector extraction,
- OpenSpec-guarded verdict,
- candidate validation,
- rerun proof,
- reviewable patch or bug report,
- AI trace transparency,
- AI cost transparency,
- honest OpenAI failure handling without deterministic or precomputed verdict fallback,
- Jira publishing for actionable results.

Jira integration OpenSpec defines:

- Jira configuration readiness,
- automatic issue publishing for actionable results,
- issue type mapping,
- Jira payload content,
- Atlassian Document Format descriptions,
- publish result persistence,
- publish retry,
- transparent publish failure handling.

## Current Alignment

- Build this repo as the from-zero hackathon app.
- SpecHeal is a proposal-and-proof system, not an automatic product-code fixer.
- `HEAL` means SpecHeal applies a reviewable Playwright test locator patch in the controlled demo runtime after OpenSpec guardrail and browser validation, then proves it with rerun.
- `PRODUCT BUG` means required product behavior is missing or unavailable; SpecHeal produces evidence and a Jira Bug, not a safe patch.
- `SPEC OUTDATED` means the test/spec mapping needs human review; SpecHeal produces a Jira Task.
- `NO_HEAL_NEEDED` means the baseline run passed; persist it as an audit report and do not create a Jira issue by default.
- Live OpenAI is required for failed-run recovery verdicts. If OpenAI is unavailable or invalid, record an honest operational failure and do not substitute a hardcoded verdict.
- Live Jira issue creation is required for actionable results: `HEAL`, `PRODUCT BUG`, `SPEC OUTDATED`, and operational run errors. Jira is not required for healthy/no-heal reports by default.

## Suggested Architecture

Recommended stack:

- Next.js app router for the dashboard and demo app.
- Playwright for browser execution, evidence capture, validation, and rerun.
- OpenAI `gpt-4o-mini` for structured verdict generation.
- PostgreSQL with Drizzle or another typed persistence layer for run history and reports.
- Docker/Kubernetes or k3s deployment for demo readiness, using one app container plus PostgreSQL as the separate data service for MVP.

Suggested runtime flow:

```text
Dashboard
-> POST /api/specheal with scenarioId
-> create run record
-> in-process Playwright runner opens /shopflow?state=<scenario>
-> run old selector
-> capture evidence on failure
-> load relevant OpenSpec clause
-> get live OpenAI structured verdict
-> validate candidate selector if HEAL
-> apply validated patch to the target Playwright test file if HEAL
-> rerun checkout from the patched test file
-> save structured report
-> publish Jira issue when the result is actionable
-> dashboard renders timeline, patch/report, Jira status when applicable, and trace
```

## UX Direction

SpecHeal should feel like an engineering recovery cockpit, not a landing page, chatbot, or generic QA form.

Dashboard should make the recovery story visible:

1. Playwright test result.
2. Failure evidence.
3. OpenSpec clause used.
4. AI verdict.
5. HEAL proof.
6. Product bug report.

The judge should be able to click a seeded scenario and see a real result without filling a blank spec or arbitrary selector form.

## Non-Goals For The Hackathon MVP

Avoid making these the critical path:

- arbitrary website testing,
- GitHub PR automation,
- auth or multi-tenant SaaS features,
- large-scale analytics,
- generic AI chatbot UX,
- arbitrary production repository mutation beyond the controlled demo test-file patch.

Live Jira issue creation is part of the MVP, not stretch. SpecHeal must publish recovery output into Jira when a run produces an actionable result.

## MVP Proof Points

The build should prove:

- ShopFlow Checkout demo states.
- OpenSpec as guardrail.
- Live OpenAI structured verdict.
- Playwright evidence capture.
- Candidate ranking.
- Browser validation.
- Controlled test-file patch application for safe `HEAL`.
- Rerun proof.
- Dashboard timeline.
- Live Jira issue publishing.
- PostgreSQL persistence.
- Kubernetes deployment.

## Working Agreement For Agents

- Start by reading this file and `openspec/config.yaml`.
- If OpenSpec artifacts do not exist yet, create/propose them before large implementation work.
- Keep the MVP narrow: ShopFlow Checkout plus safe test recovery.
- Preserve the product thesis: prevent false green with OpenSpec guardrails.
- Treat live OpenAI and live Jira publishing as MVP requirements.
- Prefer end-to-end proof over broad features.
- If a decision would expand scope, ask the user first.
