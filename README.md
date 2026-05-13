<div align="center">

# SpecHeal

**AI-assisted recovery cockpit for Playwright UI test failures.**

SpecHeal decides whether a broken UI test is safe to heal, or whether the product is actually broken.

[![Demo](https://img.shields.io/badge/demo-live-22c55e?style=flat-square)](http://merge-kalau-berani.hackathon.sev-2.com)
[![OpenSpec](https://img.shields.io/badge/OpenSpec-guardrail-38bdf8?style=flat-square)](./openspec)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-10a37f?style=flat-square)](./src/lib/specheal/openai-verdict.ts)
[![Playwright](https://img.shields.io/badge/Playwright-1.60.0-45ba4b?style=flat-square)](./playwright.config.ts)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-persistence-336791?style=flat-square)](./src/db/schema.ts)
[![Jira](https://img.shields.io/badge/Jira-workflow-0052cc?style=flat-square)](./src/lib/specheal/jira.ts)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-ready-326ce5?style=flat-square)](./k8s)

`Playwright failure -> Evidence -> OpenSpec -> OpenAI -> Browser validation -> Controlled patch -> Rerun proof -> PostgreSQL -> Jira`

</div>

---

## Table of Contents

- [What is SpecHeal?](#what-is-specheal)
- [Why this exists](#why-this-exists)
- [Demo scenarios](#demo-scenarios)
- [How recovery works](#how-recovery-works)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Development commands](#development-commands)
- [Project structure](#project-structure)
- [OpenSpec contracts](#openspec-contracts)
- [Database model](#database-model)
- [Jira handoff](#jira-handoff)
- [AI trace and cost transparency](#ai-trace-and-cost-transparency)
- [Docker and Kubernetes](#docker-and-kubernetes)
- [Verification checklist](#verification-checklist)
- [Troubleshooting](#troubleshooting)
- [Docs](#docs)

## What is SpecHeal?

SpecHeal is a from-zero hackathon MVP for **Refactory Hackathon 2026**. It is an engineering productivity product that turns Playwright UI test failures into trustworthy recovery decisions.

Most UI self-healing tools optimize for making tests green. SpecHeal optimizes for **not creating a false green**.

Core thesis:

> SpecHeal is not just making tests green. SpecHeal makes test recovery trustworthy.

Short mechanism:

```text
AI proposes.
OpenSpec guards.
Browser validates.
Rerun proves.
Jira tracks.
```

The MVP is intentionally narrow: a seeded **ShopFlow Checkout** app with three scenarios. A judge or QA engineer can run each scenario from the dashboard, inspect evidence, view AI trace and token cost, see proof, and follow the Jira handoff.

## Why this exists

UI automation often fails because selectors drift, even when the user-facing behavior is still correct.

Example:

```ts
await page.click("#pay-now");
```

After a UI refactor, the product may still expose the same payment behavior under a better locator:

```html
<button data-testid="complete-payment">Pay Now</button>
```

Blind self-healing might replace the selector and mark the suite green. That is dangerous when the product requirement is actually missing. SpecHeal separates these cases:

| Case | What happened | SpecHeal decision |
| --- | --- | --- |
| Healthy Flow | Baseline test already reaches `Payment Success` | `NO_HEAL_NEEDED` |
| Locator Drift | Old selector is gone, but valid payment behavior still exists | `HEAL` |
| Product Bug | Required payment action is missing or unavailable | `PRODUCT BUG` |
| Spec/Test mismatch | Selector replacement is insufficient because the intended flow changed | `SPEC OUTDATED` |
| Runtime failure | OpenAI, Playwright, DB, or orchestration fails before trusted analysis | `RUN_ERROR` |

## Demo scenarios

| Scenario | ShopFlow state | Expected result | Jira behavior |
| --- | --- | --- | --- |
| **Healthy Flow** | `normal` | Baseline test passes with no recovery | No Jira issue by default |
| **Locator Drift** | `drift` | OpenAI returns `HEAL`, browser validation passes, controlled patch is applied, rerun reaches `Payment Success` | Jira Task for patch review |
| **Product Bug** | `bug` | No valid payment action exists, no patch is generated | Jira Bug for product regression |

Seeded route:

```text
/shopflow?state=normal
/shopflow?state=drift
/shopflow?state=bug
```

The main dashboard is available at:

```text
http://localhost:3000
```

Production demo:

```text
http://merge-kalau-berani.hackathon.sev-2.com
```

## How recovery works

```mermaid
flowchart LR
  failure["Playwright failure"]
  evidence["Evidence capture<br/>screenshot, DOM, visible text, candidates"]
  openspec["OpenSpec lookup<br/>selector-agnostic behavior"]
  openai["OpenAI verdict<br/>structured output"]
  validation["Browser validation<br/>unique, visible, enabled, clickable"]
  patch["Controlled test patch<br/>SpecHeal owns executable line"]
  rerun["Rerun proof<br/>requires Payment Success"]
  postgres[("PostgreSQL<br/>audit trail")]
  jira["Jira<br/>Task or Bug"]

  failure --> evidence --> openspec --> openai
  openai --> validation --> patch --> rerun
  rerun --> postgres --> jira
  openai -->|"PRODUCT BUG / SPEC OUTDATED / RUN_ERROR"| postgres
```

Important safety rules:

- OpenAI does **not** directly own the executable patch line.
- OpenSpec describes checkout behavior, not implementation selectors.
- A `HEAL` patch is safe only after browser validation and rerun proof.
- `PRODUCT BUG` never generates a selector patch.
- If OpenAI is missing or fails, SpecHeal records `RUN_ERROR` instead of faking a verdict.

## Architecture

SpecHeal runs as a Next.js app with API routes, an in-process Playwright runner, OpenAI verdict generation, PostgreSQL persistence, and Jira publishing.

```mermaid
flowchart LR
  user["QA Engineer / Judge"]

  subgraph app["SpecHeal App"]
    dashboard["Dashboard UI<br/>scenario picker, progress trace, report"]
    api["Run API<br/>create, poll, fetch report, retry Jira"]
    orchestrator["Run Orchestrator"]
    runner["Playwright Runner"]
    collector["Evidence Collector"]
    cleaner["DOM Cleaner"]
    specLoader["OpenSpec Loader"]
    verdict["OpenAI Verdict Engine"]
    validator["Candidate Validator"]
    patcher["Patch Applicator"]
    proof["Rerun Proof Engine"]
    publisher["Jira Publisher"]
    repository["Run Repository"]
  end

  shopflow["ShopFlow Checkout"]
  openspec["OpenSpec files"]
  postgres[("PostgreSQL")]
  openai["OpenAI API"]
  jira["Jira Cloud"]

  user --> dashboard
  dashboard --> api --> orchestrator
  orchestrator --> runner --> shopflow
  runner --> collector --> cleaner --> verdict
  specLoader --> openspec
  orchestrator --> specLoader
  verdict --> openai
  verdict --> validator --> patcher --> proof --> shopflow
  orchestrator --> repository --> postgres
  publisher --> jira
  orchestrator --> publisher
```

For the full C4 model, see [docs/architecture-c4.md](./docs/architecture-c4.md).

## Tech stack

| Layer | Technology |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript |
| Browser automation | Playwright 1.60 |
| AI verdict engine | OpenAI `gpt-4o-mini` with structured parsing |
| Specification guardrail | OpenSpec change artifacts |
| Persistence | PostgreSQL, Drizzle ORM |
| Workflow handoff | Jira Cloud REST API, Atlassian Document Format |
| Deployment | Docker, GitHub Actions, GHCR, Kubernetes |
| Runtime image | `mcr.microsoft.com/playwright:v1.60.0-noble` |

## Quick start

### Prerequisites

- Node.js 22 recommended
- npm
- PostgreSQL
- OpenAI API key
- Jira Cloud API token and project key, required for actionable Jira publishing
- OpenSpec CLI if you want to validate specs locally

Install the OpenSpec CLI:

```bash
npm install --global @fission-ai/openspec@1.3.1
```

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_BASE_URL=http://localhost:3000
PLAYWRIGHT_HEADLESS=true
DATABASE_URL=postgresql://specheal:specheal@localhost:5432/specheal
JIRA_SITE_URL=https://<team>.atlassian.net
JIRA_USER_EMAIL=<jira-account-email>
JIRA_API_TOKEN=<atlassian-api-token>
JIRA_PROJECT_KEY=SH
JIRA_TASK_ISSUE_TYPE=Task
JIRA_BUG_ISSUE_TYPE=Bug
```

### 3. Start PostgreSQL locally

One simple local option:

```bash
docker run --name specheal-postgres \
  -e POSTGRES_USER=specheal \
  -e POSTGRES_PASSWORD=specheal \
  -e POSTGRES_DB=specheal \
  -p 5432:5432 \
  -d postgres:16
```

### 4. Push the database schema

Drizzle reads `DATABASE_URL` from the shell, so export the values before pushing:

```bash
set -a
source .env.local
set +a
npm run db:push
```

### 5. Run the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string for runs, evidence, AI traces, patches, reruns, and Jira publish results |
| `OPENAI_API_KEY` | Yes | Live OpenAI recovery verdict generation |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `NEXT_PUBLIC_BASE_URL` | No | Base URL used by the runtime, defaults to `http://localhost:3000` |
| `PLAYWRIGHT_HEADLESS` | No | `true` by default |
| `JIRA_SITE_URL` | Yes for Jira | Jira Cloud site URL |
| `JIRA_USER_EMAIL` | Yes for Jira | Jira account email used for API authentication |
| `JIRA_API_TOKEN` | Yes for Jira | Atlassian API token |
| `JIRA_PROJECT_KEY` | Yes for Jira | Target Jira project key, default `SH` |
| `JIRA_TASK_ISSUE_TYPE` | No | Defaults to `Task` |
| `JIRA_BUG_ISSUE_TYPE` | No | Defaults to `Bug` |

Secrets are read server-side only. Jira API token and user email must not be persisted in PostgreSQL, report JSON, dashboard output, or Jira issue bodies.

## Development commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build production app |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript typecheck |
| `npm run verify:mvp` | Verify key MVP guardrails in code and OpenSpec |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to PostgreSQL |
| `openspec validate --all` | Validate all active OpenSpec changes |

Manual API run:

```bash
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"locator-drift"}'
```

Supported `scenarioId` values:

```text
healthy-flow
locator-drift
product-bug
```

## Project structure

```text
specheal/
|-- src/
|   |-- app/
|   |   |-- api/runs/                 # run creation, polling, report fetch, Jira retry
|   |   |-- dashboard.tsx             # recovery cockpit UI
|   |   |-- run-view.tsx              # dashboard/full-report renderer
|   |   `-- shopflow/                 # seeded ShopFlow checkout app
|   |-- db/
|   |   `-- schema.ts                 # PostgreSQL tables and enums
|   |-- demo/
|   |   `-- shopflow.ts               # scenario definitions
|   `-- lib/specheal/
|       |-- evidence.ts               # screenshot, DOM cleaning, visible evidence, candidates
|       |-- openai-verdict.ts         # live OpenAI structured verdict call
|       |-- openspec.ts               # managed OpenSpec loading
|       |-- orchestrator.ts           # recovery run lifecycle
|       |-- proof.ts                  # validation, patch, rerun proof output
|       |-- jira.ts                   # Jira ADF payload and publishing
|       |-- runs.ts                   # repository and run creation
|       |-- run-report.ts             # report shaping
|       `-- ai-cost.ts                # token and cost estimation
|-- openspec/
|   `-- changes/                      # active OpenSpec change contracts
|-- tests/
|   `-- shopflow-checkout.spec.ts     # controlled Playwright test file
|-- k8s/
|   |-- app.yaml                      # app deployment, service, ingress
|   |-- postgres.yaml                 # optional PostgreSQL fallback
|   `-- secret.template.yaml          # secret template
|-- docs/
|   |-- PRD.md
|   |-- architecture-c4.md
|   |-- DEMO_SCRIPT.md
|   `-- DEPLOYMENT.md
|-- Dockerfile
|-- playwright.config.ts
|-- drizzle.config.ts
`-- package.json
```

## OpenSpec contracts

OpenSpec is the behavior source of truth. The active changes define:

| Capability | Purpose |
| --- | --- |
| `shopflow-checkout` | Selector-agnostic checkout behavior: payment action must be visible/enabled when available and must reach `Payment Success` |
| `specheal-recovery` | Recovery pipeline: scenario runs, Playwright evidence, OpenAI verdicts, validation, patching, rerun proof, reports, PostgreSQL, Kubernetes |
| `jira-integration` | Jira readiness, issue type mapping, ADF payloads, retry, failure transparency |
| `evidence-token-transparency` | DOM cleaning audit, visible evidence, token usage, estimated cost |
| `recovery-cockpit-ux` | Running state, staged progress, trace drawer, visual hierarchy |
| `candidate-report-polish` | Explainable ranking and copy-ready handoff blocks |

Validate:

```bash
openspec validate --all
```

## Database model

SpecHeal persists every run as an audit trail.

Main tables:

| Table | Stores |
| --- | --- |
| `specheal_runs` | scenario, status, verdict, reason, target URL, OpenSpec reference, report JSON |
| `run_evidence` | Playwright error, screenshot, raw/cleaned DOM metrics, visible evidence, candidates |
| `ai_traces` | model, prompts, raw response, parsed response, token usage, estimated cost, duration, errors |
| `validation_results` | candidate selector validation proof |
| `patch_previews` | target file, old line, new line, applied diff, explanation |
| `rerun_results` | patched test proof and duration |
| `jira_publish_results` | Jira status, issue key, URL, payload, errors |

Terminal run verdicts:

```text
NO_HEAL_NEEDED
HEAL
PRODUCT BUG
SPEC OUTDATED
RUN_ERROR
```

OpenAI recovery verdicts are intentionally narrower:

```text
HEAL
PRODUCT BUG
SPEC OUTDATED
```

`NO_HEAL_NEEDED` and `RUN_ERROR` are assigned by the SpecHeal orchestrator.

## Jira handoff

SpecHeal creates Jira issues only for actionable terminal results.

| Terminal result | Jira issue |
| --- | --- |
| `NO_HEAL_NEEDED` | No issue by default |
| `HEAL` | Task for reviewing and applying the safe test patch |
| `PRODUCT BUG` | Bug for fixing the product regression |
| `SPEC OUTDATED` | Task for updating test/spec mapping |
| `RUN_ERROR` | Task for investigating runtime/config failure |

Jira descriptions use Atlassian Document Format. Reports remain available in SpecHeal even if Jira publishing fails, and failed Jira publish attempts can be retried from the run report.

## AI trace and cost transparency

Every failed-run recovery analysis exposes:

- system prompt,
- user prompt,
- raw OpenAI response,
- parsed verdict,
- model name,
- prompt tokens,
- cached prompt tokens when available,
- completion tokens,
- total tokens,
- estimated input/cached/output cost,
- pricing source,
- duration,
- OpenAI error context when analysis fails.

Cost values are estimates, not billing statements. The current pricing constants live in [src/lib/specheal/ai-cost.ts](./src/lib/specheal/ai-cost.ts).

## Docker and Kubernetes

Build the production image:

```bash
docker build -t ghcr.io/antech2-async/specheal:production .
```

GitHub Actions builds and pushes:

```text
ghcr.io/antech2-async/specheal:production
ghcr.io/antech2-async/specheal:sha-<short-sha>
```

For demo stability, prefer deploying a pinned `sha-<short-sha>` tag.

Kubernetes target names:

```text
namespace: merge-kalau-berani
deployment: specheal-app
container: specheal
image: ghcr.io/antech2-async/specheal:<tag>
```

Deploy a new image:

```bash
kubectl --kubeconfig "<path-to-kubeconfig>" \
  -n merge-kalau-berani \
  set image deployment/specheal-app specheal=ghcr.io/antech2-async/specheal:<tag>

kubectl --kubeconfig "<path-to-kubeconfig>" \
  -n merge-kalau-berani \
  rollout status deployment/specheal-app --timeout=180s
```

Verify the running image:

```bash
kubectl --kubeconfig "<path-to-kubeconfig>" \
  -n merge-kalau-berani \
  get deployment/specheal-app -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Full deployment notes: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Verification checklist

Before demo or merge:

```bash
npm run typecheck
npm run lint
npm run verify:mvp
npm run build
openspec validate --all
```

Manual product checks:

- Dashboard shows readiness for OpenAI, PostgreSQL, Jira, and Playwright.
- Healthy Flow completes as `NO_HEAL_NEEDED` and does not create Jira noise.
- Locator Drift completes as `HEAL`, shows validation proof, patch preview, rerun proof, and Jira Task.
- Product Bug completes as `PRODUCT BUG`, shows zero-candidate evidence, no patch, and Jira Bug.
- Full report shows timeline, evidence, OpenSpec clause, AI trace, cost counter, patch/bug output, and Jira result.

## Troubleshooting

### "Request body must include a valid scenarioId."

The run API needs one of the seeded scenario IDs:

```json
{ "scenarioId": "locator-drift" }
```

Valid values are `healthy-flow`, `locator-drift`, and `product-bug`.

### OpenAI is missing or failed

Set `OPENAI_API_KEY` in `.env.local`. Failed runs require live OpenAI analysis. SpecHeal intentionally does not substitute a hardcoded verdict.

### Jira is not ready

Check:

```text
JIRA_SITE_URL
JIRA_USER_EMAIL
JIRA_API_TOKEN
JIRA_PROJECT_KEY
```

The Jira account must have permission to create the configured Task and Bug issue types.

### Database connection fails

Confirm PostgreSQL is running and `DATABASE_URL` is exported before `npm run db:push`.

```bash
set -a
source .env.local
set +a
npm run db:push
```

### Playwright cannot launch in deployment

The production Dockerfile uses the official Playwright base image and sets:

```text
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
```

If you change the base image, make sure Chromium and system dependencies are installed.

### Jira publish failed but the run succeeded

This is expected failure transparency. The report remains stored in PostgreSQL, and Jira publishing can be retried from the full report using current Jira credentials.

## Docs

- [Product Requirements Document](./docs/PRD.md)
- [C4 Architecture](./docs/architecture-c4.md)
- [5-Minute Demo Script](./docs/DEMO_SCRIPT.md)
- [Kubernetes Deployment](./docs/DEPLOYMENT.md)
- [OpenSpec changes](./openspec/changes)

---

Built for Refactory Hackathon 2026, Telkom Round.
