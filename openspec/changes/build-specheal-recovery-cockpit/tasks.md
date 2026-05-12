## 1. Project Foundation

- [ ] 1.1 Scaffold the web application with TypeScript, React/Next.js, linting, and environment configuration.
- [ ] 1.2 Add runtime dependencies for Playwright, OpenAI, PostgreSQL access, Jira API calls, and validation utilities.
- [ ] 1.3 Define required environment variables for OpenAI, Jira, database, base URL, and Playwright runtime.
- [ ] 1.4 Create initial PostgreSQL schema for runs, evidence, AI traces, validation results, rerun results, patch previews, and Jira publish results.

## 2. ShopFlow Checkout Demo

- [ ] 2.1 Implement the ShopFlow Checkout route with order details, payment summary, and success state.
- [ ] 2.2 Implement Healthy Flow state where baseline checkout reaches `Payment Success`.
- [ ] 2.3 Implement Locator Drift state where baseline selector fails but payment behavior remains available.
- [ ] 2.4 Implement Product Bug state where payment action is unavailable and user-visible evidence is shown.
- [ ] 2.5 Add ShopFlow OpenSpec source text that remains selector-agnostic and behavior-first.

## 3. Recovery Run Orchestration

- [ ] 3.1 Implement run creation API that accepts a scenario identifier and persists initial run state.
- [ ] 3.2 Implement background/in-process orchestration that executes the selected scenario without blocking the initial request.
- [ ] 3.3 Implement run polling API and recent runs API from PostgreSQL.
- [ ] 3.4 Implement terminal run states for completed verdicts and operational errors.

## 4. Playwright Evidence Pipeline

- [ ] 4.1 Implement Playwright checkout execution against the selected ShopFlow state.
- [ ] 4.2 Capture failure evidence: error, screenshot, failed selector, target URL, raw DOM length, and visible page text.
- [ ] 4.3 Implement DOM cleaning and sensitive data masking.
- [ ] 4.4 Implement candidate extraction from visible/enabled body-level interactive elements.
- [ ] 4.5 Implement candidate ranking and explicit zero-candidate reporting.

## 5. OpenAI Verdict Pipeline

- [ ] 5.1 Implement prompt builder using test metadata, failure evidence, candidate context, and OpenSpec clause.
- [ ] 5.2 Implement live OpenAI call with structured response parsing.
- [ ] 5.3 Support verdicts `HEAL`, `PRODUCT BUG`, and `SPEC OUTDATED` for failed runs.
- [ ] 5.4 Store system prompt, user prompt, raw response, parsed response, usage metadata, duration, and estimated cost when available.
- [ ] 5.5 Implement clear AI failure handling without silently substituting deterministic verdicts.

## 6. Validation, Rerun, and Output Generation

- [ ] 6.1 Implement browser validation for `HEAL` candidate selectors.
- [ ] 6.2 Implement rerun proof with the validated candidate selector.
- [ ] 6.3 Generate safe patch preview only after validation and rerun pass.
- [ ] 6.4 Generate product bug report output when required OpenSpec behavior is missing.
- [ ] 6.5 Generate operational error report output when the run fails before a recovery verdict.

## 7. Jira Integration

- [ ] 7.1 Implement Jira configuration reader and readiness status.
- [ ] 7.2 Implement Jira Cloud create issue client using Atlassian email and API token.
- [ ] 7.3 Build Atlassian Document Format descriptions for all terminal run result types.
- [ ] 7.4 Auto-publish `NO_HEAL_NEEDED` runs to Jira as audit Tasks.
- [ ] 7.5 Auto-publish `HEAL` runs to Jira as patch review Tasks.
- [ ] 7.6 Auto-publish `PRODUCT BUG` runs to Jira as Bugs.
- [ ] 7.7 Auto-publish `SPEC OUTDATED` and operational error runs to Jira as Tasks.
- [ ] 7.8 Persist Jira issue key, URL, issue ID, publish timestamp, and failure details.
- [ ] 7.9 Implement retry publish endpoint for runs with `jira_publish_failed`.

## 8. Dashboard and Report UX

- [ ] 8.1 Build main dashboard with project status, scenario picker, run CTA, and readiness indicators.
- [ ] 8.2 Build run timeline showing Playwright result, evidence, OpenSpec clause, OpenAI verdict, proof/decision, and Jira publish result.
- [ ] 8.3 Build evidence and output panels for screenshot, candidate summary, patch preview, product bug report, and Jira status.
- [ ] 8.4 Build AI trace drawer showing prompt, raw output, parsed output, validation details, token usage, and cost estimate.
- [ ] 8.5 Build full report page by run ID.
- [ ] 8.6 Ensure failed OpenAI and failed Jira states are visible and understandable.

## 9. Kubernetes Deployment

- [ ] 9.1 Create Dockerfile that includes app runtime and Playwright browser dependencies.
- [ ] 9.2 Create Kubernetes manifests for app Deployment, Service, and optional Ingress.
- [ ] 9.3 Create PostgreSQL deployment/service or document external PostgreSQL connection.
- [ ] 9.4 Create Kubernetes Secret template for OpenAI, Jira, database, and runtime config.
- [ ] 9.5 Verify the deployed dashboard can reach OpenAI, Jira, PostgreSQL, and ShopFlow runtime routes.

## 10. Verification and Demo Readiness

- [ ] 10.1 Add tests for OpenSpec clause alignment and selector-agnostic ShopFlow requirements.
- [ ] 10.2 Add tests for DOM cleaning, candidate extraction, and zero-candidate behavior.
- [ ] 10.3 Add tests or scripted checks for Jira payload mapping.
- [ ] 10.4 Run Locator Drift scenario end-to-end with live OpenAI and Jira Task creation.
- [ ] 10.5 Run Product Bug scenario end-to-end with live OpenAI and Jira Bug creation.
- [ ] 10.6 Verify recent runs and full report persist after reload.
- [ ] 10.7 Prepare a 5-minute demo script using the deployed Kubernetes URL.
