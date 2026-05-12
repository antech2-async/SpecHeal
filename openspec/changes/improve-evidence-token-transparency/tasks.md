## 1. Evidence Capture

- [x] 1.1 Add DOM cleaning audit metadata with removed noise summary and truncation marker.
- [x] 1.2 Add visible evidence extraction for page title, URL, body text, payment section, error text, candidate count, and notes.
- [x] 1.3 Persist enriched evidence in the run report and existing evidence JSON payload.

## 2. AI Trace and Cost

- [x] 2.1 Include visible evidence and DOM cleaning metadata in the OpenAI verdict prompt.
- [x] 2.2 Capture cached prompt tokens when OpenAI exposes them.
- [x] 2.3 Add a cost breakdown helper for prompt, cached prompt, completion, total tokens, and estimated cost.
- [x] 2.4 Preserve detailed usage/cost metadata in the run report without requiring a schema migration.

## 3. Cockpit UI

- [x] 3.1 Add a visible evidence panel to dashboard and full-report evidence views.
- [x] 3.2 Add DOM cleaning audit details and cleaned DOM excerpt controls.
- [x] 3.3 Upgrade AI trace summary with token counter, cached-token display, cost breakdown, and pricing source.

## 4. Verification

- [x] 4.1 Update MVP verification checks for DOM audit, visible evidence, and cost metadata.
- [x] 4.2 Run OpenSpec validation for this change.
- [x] 4.3 Run lint, automated tests, and production build.
- [x] 4.4 Run UI smoke checks for failed-run evidence and trace surfaces.
