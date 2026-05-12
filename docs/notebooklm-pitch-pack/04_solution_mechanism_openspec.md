# Solution Mechanism And OpenSpec

## Solution Thesis

SpecHeal is not blind self-healing.

SpecHeal is evidence-backed test recovery:

> OpenSpec becomes the source of truth. OpenAI gives a structured verdict. Browser proof decides whether a heal can be trusted.

## What SpecHeal Does

When a Playwright UI test fails, SpecHeal:

1. runs the scenario in a real browser;
2. captures failure evidence;
3. reads the relevant OpenSpec requirement;
4. asks OpenAI for a structured recovery verdict;
5. validates a HEAL candidate in browser;
6. applies a controlled locator patch to the Playwright test file;
7. reruns the patched test and requires `Payment Success`;
8. stores the full report in PostgreSQL;
9. publishes actionable results to Jira.

## Safe Recovery Loop

Use this exact loop in the deck:

```text
Playwright failure
-> evidence capture
-> OpenSpec requirement
-> OpenAI verdict
-> browser validation
-> controlled test-file patch
-> rerun proof
-> Jira action
```

## Why OpenSpec Matters

Without OpenSpec, the AI can only guess from UI evidence.

With OpenSpec, SpecHeal can compare the failure against expected behavior:

- Should checkout have a visible payment action?
- Should payment action be enabled?
- Should clicking it reach `Payment Success`?
- Is the behavior still present under a different locator?
- Or is the product behavior missing?

OpenSpec makes the question behavior-first:

> Bukan selector mana yang mirip, tapi behavior mana yang benar.

## Role of OpenAI

OpenAI is used for structured failure analysis.

Input:

- failed selector
- Playwright error
- screenshot/DOM/visible text evidence
- ranked candidate elements
- OpenSpec clause
- scenario metadata

Output:

- verdict
- reason
- confidence
- candidate selector if applicable
- patch object if applicable
- Jira-ready report object

Model:

- `gpt-4o-mini`

Important framing:

OpenAI is core innovation, but it is not trusted blindly. Its verdict must pass product safety gates.

## Verdicts

### NO_HEAL_NEEDED

The baseline Playwright test passes. No recovery needed. Report is persisted. Jira is not created by default.

### HEAL

The old locator failed, but product behavior still satisfies OpenSpec. Candidate selector is validated and rerun proof passes.

Output:

- applied patch preview;
- validation proof;
- rerun proof;
- Jira Task.

### PRODUCT BUG

Required behavior is missing or unavailable.

Output:

- Jira Bug;
- evidence;
- no patch.

### SPEC OUTDATED

The test/spec mapping no longer matches intended behavior.

Output:

- Jira Task for spec/test review.

### RUN_ERROR

Operational failure before trusted recovery verdict is available.

Output:

- Jira Task for runtime investigation.

## Safety Gates

SpecHeal only treats HEAL as safe when:

1. candidate selector exists;
2. selector matches exactly one visible enabled element;
3. element can accept the intended action;
4. controlled test-file patch is applied;
5. patched test rerun reaches `Payment Success`;
6. report is stored;
7. Jira Task is created for human review.

## What SpecHeal Does Not Do

SpecHeal does not:

- fix product code;
- auto-commit patches;
- auto-merge changes;
- create GitHub PR in the MVP;
- test arbitrary websites in the MVP;
- replace QA engineers;
- trust AI output without proof.

## Best Solution Slide Framing

Recommended headline:

> SpecHeal mengubah failed UI test menjadi keputusan engineering yang bisa diaudit.

Recommended body:

> Dengan OpenSpec sebagai source of truth, OpenAI sebagai reasoning engine, dan rerun proof sebagai safety gate, SpecHeal membedakan locator drift dari product bug sebelum hasilnya dikirim ke Jira.

