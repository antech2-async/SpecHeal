# SpecHeal Project Memory

This repository is the from-zero hackathon build for **SpecHeal**.

The goal of this file is to give incoming agents and collaborators enough project context before OpenSpec artifacts and application code exist. Treat this as working memory, not as the final specification.

## Event Context

- Event: Refactory Hackathon 2026, Telkom round, May 12-13, 2026.
- Challenge theme: Engineering Productivity x AI.
- Required direction: build a real end-to-end AI-powered software engineering productivity product.
- Required foundations from the event brief: OpenSpec, LLMs, Kubernetes/deployment, and PostgreSQL.
- Judging emphasis: innovation, impact, technical execution, UX/design, and clear presentation.
- Important rule: all hackathon project code must be developed during the hackathon. Older experiments may be used as knowledge/reference, but do not copy pre-existing non-open-source project code into this repo.

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

Expected product bug output:

```text
Title: Checkout payment action missing from ShopFlow checkout
Summary: The checkout payment test failed because the payment action required by OpenSpec is missing or unavailable.
Recommended action: Restore the payment CTA or update the ShopFlow OpenSpec if the checkout flow intentionally changed.
```

## OpenSpec Direction

OpenSpec has not been authored in this repo yet.

When creating the first OpenSpec artifacts, separate these two domains:

- `shopflow-checkout`: product behavior of the tiny checkout app under test.
- `specheal-recovery`: behavior of SpecHeal itself as a safe recovery product.

ShopFlow product OpenSpec should be selector-agnostic:

- It should define payment completion behavior.
- It should say a payment action must be visible and enabled when payment is available.
- It should say the product requirement is not satisfied if no valid payment action exists.
- It should not mention `#pay-now`, `data-testid`, Playwright, or healing internals.

SpecHeal recovery OpenSpec should define:

- seeded demo project and scenario picker,
- failure evidence capture,
- cleaned DOM evidence,
- candidate selector extraction,
- OpenSpec-guarded verdict,
- candidate validation,
- rerun proof,
- reviewable patch or bug report,
- AI trace transparency,
- AI cost and fallback transparency.

## Suggested Architecture

Recommended stack:

- Next.js app router for the dashboard and demo app.
- Playwright for browser execution, evidence capture, validation, and rerun.
- LLM provider for structured verdict generation.
- PostgreSQL with Drizzle or another typed persistence layer for run history and reports.
- Docker/Kubernetes or k3s deployment for demo readiness.

Suggested runtime flow:

```text
Dashboard
-> POST /api/specheal with scenarioId
-> create run record
-> worker opens /shopflow?state=<scenario>
-> run old selector
-> capture evidence on failure
-> load relevant OpenSpec clause
-> get AI or deterministic fallback verdict
-> validate candidate selector if HEAL
-> rerun checkout with healed selector
-> save structured report
-> dashboard renders timeline, patch/report, and trace
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
- real test file patching before the basic demo loop works.

Live Jira issue creation is part of the MVP, not stretch. SpecHeal must publish recovery output into Jira when a run produces an actionable result.

## MVP Proof Points

The build should prove:

- ShopFlow Checkout demo states.
- OpenSpec as guardrail.
- Live OpenAI structured verdict.
- Playwright evidence capture.
- Candidate ranking.
- Browser validation.
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
