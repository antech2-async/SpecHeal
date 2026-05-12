# Claims, Limitations, And Judge Q&A

This file helps NotebookLM create a deck that sounds strong without overclaiming.

## How To Frame The MVP

SpecHeal is a scoped but complete MVP:

- seeded ShopFlow Checkout target;
- three demo scenarios;
- live OpenAI verdict;
- OpenSpec as source of truth;
- browser validation;
- controlled test-file patch;
- rerun proof;
- PostgreSQL audit store;
- Jira issue publishing;
- Kubernetes deployment path.

The MVP is not arbitrary website testing. That is a future extension.

## Claim Guardrails

### Safe Claim

SpecHeal separates safe locator drift from product regression.

### Avoid

SpecHeal fixes all UI test failures automatically.

### Safe Claim

SpecHeal uses OpenAI for structured verdict generation, then gates HEAL with validation and rerun proof.

### Avoid

OpenAI always knows the correct answer.

### Safe Claim

SpecHeal applies a controlled Playwright locator patch in the runtime workspace and shows the applied diff for human review.

### Avoid

SpecHeal auto-commits code or merges changes.

### Safe Claim

Product bugs are escalated through Jira with evidence.

### Avoid

SpecHeal repairs product bugs.

### Safe Claim

OpenSpec is the behavior source of truth for the demo flow.

### Avoid

OpenSpec eliminates all ambiguity in every real-world product.

## Likely Judge Questions

### Q1: Why is this not just self-healing testing?

Because SpecHeal does not optimize only for making the test pass. It checks failure evidence against OpenSpec, asks OpenAI for a structured verdict, validates candidates in a browser, applies a controlled test-file patch, and reruns the patched test before calling HEAL safe.

### Q2: What happens if OpenAI is wrong?

OpenAI is not the only safety gate. HEAL must pass browser validation and rerun proof. If the required behavior is missing, SpecHeal should classify it as PRODUCT BUG and avoid generating a safe patch.

### Q3: Why do you need OpenSpec?

OpenSpec gives the system a behavior contract. Without it, AI can only infer from UI and selectors. With OpenSpec, SpecHeal can ask whether the checkout behavior is still correct, not merely whether another selector can be clicked.

### Q4: What is the primary user?

QA Engineer. The product helps QA understand failure cause, inspect evidence, trust or reject a heal, and hand off actionable work through Jira.

### Q5: Why Jira?

Because the output should become engineering work, not just a report. Safe HEAL becomes a Task for patch review. Product regression becomes a Bug. Operational failure becomes a Task for investigation.

### Q6: What happens for healthy runs?

Healthy runs are persisted as audit reports and do not create Jira issues by default.

### Q7: What happens if Jira fails?

The report remains stored in PostgreSQL, the Jira failure is visible, and publish can be retried.

### Q8: What happens if OpenAI is unavailable?

The run becomes an operational failure. SpecHeal does not silently substitute a deterministic or precomputed verdict.

### Q9: Does SpecHeal modify product code?

No. The MVP only applies a controlled locator patch to the Playwright test file in the runtime workspace for HEAL proof. It does not modify product implementation code.

### Q10: Can this work beyond ShopFlow?

The MVP is scoped to ShopFlow Checkout for reliable demonstration. The architecture can extend to other Playwright suites by adding project/test metadata, OpenSpec mapping, and controlled patch rules.

### Q11: Why is this valuable for engineering productivity?

It reduces the time spent interpreting ambiguous UI test failures. Instead of asking "why is CI red?" repeatedly, the team gets evidence, verdict, proof, report, and Jira handoff.

### Q12: What is the biggest risk?

The biggest risk is trusting AI too much. SpecHeal handles this by keeping OpenAI auditable and placing proof gates before HEAL is treated as safe.

## Tradeoffs To Mention

Use one small note, not a full weakness slide:

- The MVP is intentionally narrow.
- It focuses on Playwright and ShopFlow Checkout.
- It does not auto-commit patches.
- It prioritizes safety and auditability over full automation.

## Final Q&A Anchor

If the judge asks what makes SpecHeal different, answer:

> SpecHeal does not just heal selectors. It decides whether healing is safe by checking behavior against OpenSpec and proving the result in the browser.

