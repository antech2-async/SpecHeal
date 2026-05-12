## Why

SpecHeal currently captures enough evidence to make the recovery path work, but the audit surface is thinner than the reference standard: users cannot easily see what DOM noise was removed, which visible page facts guided the AI, or how much the OpenAI call cost. This matters because the product thesis is trust, not just a green rerun.

## What Changes

- Enrich failed-run evidence with DOM cleaning audit metadata, visible page evidence, payment/error excerpts, and zero-candidate notes.
- Include cleaned DOM metadata and visible evidence in the OpenAI verdict prompt so the model is grounded in user-visible behavior, not raw framework noise.
- Add token and cost transparency to run reports and the AI trace surface, including prompt, cached prompt when available, completion, total tokens, and an estimated cost breakdown.
- Improve the evidence UI so screenshots, candidates, cleaned DOM, visible text, and cost metadata are easier to scan during judging.

## Capabilities

### New Capabilities
- `evidence-token-transparency`: Captures and displays audit-ready DOM evidence, visible evidence, and OpenAI usage/cost metadata for recovery runs.

### Modified Capabilities
- `specheal-recovery`: Failed-run recovery now requires richer evidence transparency and more explicit OpenAI token/cost reporting.

## Impact

- Affected code: Playwright evidence capture, OpenAI prompt/trace generation, run report serialization, dashboard/full-report UI, and MVP verification checks.
- Affected systems: OpenAI usage metadata and PostgreSQL-backed run report JSON. No new external service is introduced.
- Deployment impact: Existing Kubernetes/GHCR flow remains unchanged; new runs will show richer evidence and cost metadata after the app image is updated.
