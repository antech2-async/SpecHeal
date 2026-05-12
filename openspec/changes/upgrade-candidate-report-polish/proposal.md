## Why

SpecHeal now captures strong evidence, but candidate reasoning is still thinner than the reference standard. Judges and QA reviewers should be able to see not only which selector was proposed, but why it was ranked above alternatives and how to reuse the final report output quickly.

## What Changes

- Enrich candidate extraction with stable locator variants, surrounding label/container context, and ranking breakdowns.
- Improve candidate display so scores, signals, suggested locators, and context are visible in the evidence and trace surfaces.
- Add copy-friendly report affordances for patch diff, Jira output, and concise recovery summaries.
- Keep Jira publishing behavior unchanged; reference baseline only has Jira-ready preview/fetch, while SpecHeal already publishes actionable results.

## Capabilities

### New Capabilities
- `candidate-report-polish`: Adds explainable candidate ranking and copy-ready report ergonomics for judged recovery runs.

### Modified Capabilities
- `specheal-recovery`: Candidate extraction and recovery reports now require richer candidate context and clearer reviewer affordances.

## Impact

- Affected code: Playwright candidate extraction, OpenAI prompt candidate payload, run report UI, evidence shelf, proof/output panels, and verification checks.
- Affected systems: no new external services, no database migration, and no change to Kubernetes/GHCR deployment flow.
