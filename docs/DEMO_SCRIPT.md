# SpecHeal 5-Minute Demo Script

Demo URL: `http://merge-kalau-berani.hackathon.sev-2.com`

## 0:00 - Setup

Open the SpecHeal dashboard and point out the readiness cards:

- OpenAI is configured for live verdicts.
- PostgreSQL stores reports and artifacts.
- Jira is configured for handoff.
- Playwright runs the browser proof inside Kubernetes.

One-line thesis:

> SpecHeal is not just making tests green. It decides whether a Playwright failure is safe to heal or should become a product bug.

## 0:45 - Healthy Flow

Select **Healthy Flow** and start a run.

Expected result:

- Verdict: `NO_HEAL_NEEDED`
- Reason: baseline checkout reaches `Payment Success`
- Jira: `not_required`

Talk track:

> Healthy runs still become audit reports, but SpecHeal does not create Jira noise when the test already passes.

## 1:30 - Locator Drift

Select **Locator Drift** and start a run.

Expected result:

- Baseline selector `#pay-now` fails.
- OpenSpec says payment completion is still required.
- OpenAI proposes `[data-testid="complete-payment"]`.
- Browser validation passes.
- SpecHeal applies a controlled Playwright test locator patch.
- Rerun proof reaches `Payment Success`.
- Jira Task is published for human review.

Talk track:

> AI proposes, OpenSpec guards, browser validates, rerun proves, and Jira tracks the review action.

## 3:15 - Product Bug

Select **Product Bug** and start a run.

Expected result:

- Baseline selector fails.
- Evidence shows no valid enabled payment action.
- Candidate count is zero.
- Verdict: `PRODUCT BUG`
- No patch is generated.
- Jira Bug is published.

Talk track:

> This is the false-green prevention. SpecHeal refuses to heal when OpenSpec-required product behavior is missing.

## 4:30 - Close

Open one full report and point out:

- Timeline of recovery stages.
- Screenshot and candidate evidence.
- OpenSpec requirement used as guardrail.
- AI trace and cost/usage transparency.
- Patch/rerun proof for HEAL or bug report for PRODUCT BUG.
- Jira issue link.

Closing line:

> SpecHeal turns flaky UI failure triage into a trustworthy recovery workflow, not a blind self-healing shortcut.
