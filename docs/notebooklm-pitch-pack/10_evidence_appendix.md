# Evidence Appendix And Source Index

Use this file as supporting evidence. Do not turn the deck into a file-by-file repo walkthrough.

## Primary Repository Sources

| Source | Purpose |
| --- | --- |
| `docs/PRD.md` | Main product narrative, problem data, requirements, scope |
| `file/SpecHeal_PRD.docx` | More polished PRD narrative and professional framing |
| `docs/architecture-c4.md` | Architecture model and diagram context |
| `docs/DEPLOYMENT.md` | Kubernetes deployment path and runtime notes |
| `openspec/changes/build-specheal-recovery-cockpit/design.md` | OpenSpec design decisions |
| `openspec/changes/build-specheal-recovery-cockpit/specs/shopflow-checkout/spec.md` | ShopFlow behavior source of truth |
| `openspec/changes/build-specheal-recovery-cockpit/specs/specheal-recovery/spec.md` | Recovery behavior requirements |
| `openspec/changes/build-specheal-recovery-cockpit/specs/jira-integration/spec.md` | Jira integration requirements |
| `openspec/changes/build-specheal-recovery-cockpit/tasks.md` | MVP implementation checklist |

## Implementation Evidence

| Source | Evidence |
| --- | --- |
| `src/app/dashboard.tsx` | Dashboard, readiness cards, scenario picker, recent runs |
| `src/app/run-view.tsx` | Run timeline, evidence panel, proof panel, Jira panel |
| `src/lib/specheal/orchestrator.ts` | End-to-end recovery orchestration |
| `src/lib/specheal/evidence.ts` | Playwright evidence, DOM cleaning, candidate extraction |
| `src/lib/specheal/openai-verdict.ts` | Live OpenAI call and structured verdict schema |
| `src/lib/specheal/proof.ts` | Candidate validation, controlled patch, rerun proof |
| `src/lib/specheal/jira.ts` | Jira Cloud issue creation and ADF payload |
| `src/db/schema.ts` | PostgreSQL persistence model |
| `src/demo/shopflow.ts` | Demo scenarios and locator drift setup |
| `tests/shopflow-checkout.spec.ts` | Controlled Playwright test target |
| `k8s/secret.template.yaml` | Runtime secret variables |
| `k8s/app.yaml` | Kubernetes app deployment |
| `Dockerfile` | Playwright-ready app container |

## Problem Data Sources

Use these links for problem evidence and speaker notes:

- Testlio test automation statistics: https://testlio.com/blog/test-automation-statistics/
- Katalon test automation statistics: https://katalon.com/resources-center/blog/test-automation-statistics-for-2025
- Slack Engineering flaky tests article: https://slack.engineering/handling-flaky-tests-at-scale-auto-detection-suppression/
- Datadog flaky tests knowledge center: https://www.datadoghq.com/knowledge-center/flaky-tests/
- Karate Labs locator drift article: https://karatelabs.io/blog/end-of-locator-hell
- BugBug self-healing article: https://bugbug.io/blog/test-automation/self-healing-test-automation/
- QA Wolf self-healing test automation article: https://www.qawolf.com/blog/self-healing-test-automation-types

## Most Important Evidence To Surface In The Deck

Surface these points:

- Automation testing is now critical engineering infrastructure.
- CI failure often does not map cleanly to product bugs.
- Locator drift is a common and expensive UI automation failure mode.
- Blind self-healing can create false green.
- OpenSpec gives SpecHeal a source of truth.
- OpenAI verdicts are auditable and structured.
- HEAL requires validation, controlled patch, and rerun proof.
- Product bugs become Jira Bugs, not fake green tests.
- Full report is stored in PostgreSQL.
- App has Kubernetes deployment artifacts.

## What To Leave Out Of The Deck

Do not spend slide space on:

- file path details;
- full C4 diagrams;
- every database table;
- internal branch/commit history;
- unresolved planning notes;
- raw PRD sections;
- long code snippets.

## Placeholder Cautions

NotebookLM must not invent:

- final deployment URL status;
- actual Jira issue keys;
- API token values;
- benchmark results from running the app;
- production readiness claims beyond the MVP scope.

