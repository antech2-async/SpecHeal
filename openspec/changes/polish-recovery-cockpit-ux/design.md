## Context

SpecHeal already proves the core recovery loop: ShopFlow scenario execution, Playwright evidence, OpenSpec context, live OpenAI verdict, validation/rerun proof, Jira publishing, PostgreSQL persistence, and Kubernetes deployment. The remaining gap is presentation quality. The dashboard currently exposes the data, but the run lifecycle can feel abrupt because pending/running states reuse the same report surface and the target checkout lacks visible processing feedback.

This change treats the UI as part of the product proof. The recovery cockpit must make the trustworthy sequence visible without changing recovery semantics or inventing fake outcomes.

## Goals / Non-Goals

**Goals:**

- Make active recovery runs visibly in-progress until orchestration reaches a terminal state.
- Prevent users from starting duplicate runs while one is active.
- Present the recovery sequence as a compact story first, with detailed evidence available on demand.
- Make AI trace inspection feel like an audit surface instead of a hidden appendix.
- Add realistic ShopFlow loading/payment feedback while preserving the existing three scenario behaviors.
- Keep all verdict, Jira, OpenAI, persistence, and Kubernetes behavior unchanged.

**Non-Goals:**

- No change to OpenAI prompts, verdict parsing, or fallback policy.
- No change to Jira issue mapping or publish rules.
- No database schema change.
- No new external UI dependency.
- No arbitrary website testing, auth, GitHub PR automation, or product-code auto-fixing.

## Decisions

### Decision 1: Add a dedicated client-side running panel

The dashboard will render a specific running surface while the current run is `pending` or `running`. It will show the selected scenario, an animated progress indicator, and the recovery stages that are already represented in the persisted timeline.

Rationale: this makes the orchestration visible during the demo without fabricating backend progress. The persisted report remains the source of truth once terminal.

Alternative considered: rely only on polling and the report header. This is simpler, but it makes the most important moment feel inactive.

### Decision 2: Keep UI polish local to existing components and CSS

The implementation will refine `dashboard.tsx`, `run-view.tsx`, `shopflow-checkout.tsx`, and `globals.css` rather than introducing a new design system.

Rationale: the app is already stable and deployed. Local changes reduce regression risk and keep the hackathon scope tight.

Alternative considered: larger component rewrite. This could improve maintainability, but it raises risk close to demo time.

### Decision 3: Trace becomes inspectable without changing stored artifacts

The AI trace UI will expose summary, prompts, response, and validation/proof context in a tabbed or drawer-like surface using existing stored artifacts.

Rationale: auditability is a core thesis. Better organization makes existing proof easier to trust without changing data contracts.

Alternative considered: attach trace files or create new artifact tables. That is unnecessary for this UX-focused change.

### Decision 4: ShopFlow feedback is visual only

ShopFlow will add short loading and payment-processing states. The three seeded scenarios remain the same: healthy uses the old selector, drift uses the new stable selector, and bug has no usable payment action.

Rationale: target-app polish improves perceived quality while keeping Playwright behavior deterministic.

Alternative considered: make the demo target more complex. That would distract from SpecHeal itself.

## Risks / Trade-offs

- Active progress UI could imply exact backend stage timing -> mitigate by labeling it as recovery sequence/progress and relying on persisted timeline for terminal proof.
- Added payment processing delay could slow tests -> keep delays short and ensure Playwright waits for `Payment Success`.
- Trace drawer/tab state could complicate `run-view.tsx` -> keep state local and avoid changing artifact types.
- CSS polish could regress mobile layout -> verify desktop and mobile screenshots after implementation.
