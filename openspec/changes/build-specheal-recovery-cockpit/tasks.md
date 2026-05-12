## 1. Project Foundation

- [x] 1.1 Scaffold the web application with TypeScript, React/Next.js, linting, and environment configuration.
- [x] 1.2 Add runtime dependencies for Playwright, OpenAI, PostgreSQL access, Jira API calls, and validation utilities.
- [x] 1.3 Define required environment variables for OpenAI model/API key, Jira Cloud REST API, database, base URL, and Playwright runtime.
- [x] 1.4 Create initial PostgreSQL schema for runs, evidence, base64 screenshots, AI traces, validation results, applied patch previews, rerun results, and Jira publish results.

## 2. ShopFlow Checkout Demo

- [x] 2.1 Implement the ShopFlow Checkout route with order details, payment summary, and success state.
- [x] 2.2 Implement Healthy Flow state where baseline checkout reaches `Payment Success`.
- [x] 2.3 Implement Locator Drift state where baseline selector fails but payment behavior remains available.
- [x] 2.4 Implement Product Bug state where payment action is unavailable and user-visible evidence is shown.
- [x] 2.5 Add ShopFlow OpenSpec source text that remains selector-agnostic and behavior-first.

## 3. Recovery Run Orchestration

- [x] 3.1 Implement run creation API that accepts a scenario identifier and persists initial run state.
- [x] 3.2 Implement background/in-process orchestration that executes the selected scenario without blocking the initial request.
- [x] 3.3 Implement run polling API and recent runs API from PostgreSQL.
- [x] 3.4 Implement terminal run states for completed verdicts and operational errors.

## 4. Playwright Evidence Pipeline

- [x] 4.1 Implement Playwright checkout execution against the selected ShopFlow state.
- [x] 4.2 Capture failure evidence: error, base64 PNG screenshot, failed selector, target URL, raw DOM length, and visible page text.
- [x] 4.3 Implement DOM cleaning and sensitive data masking.
- [x] 4.4 Implement candidate extraction from visible/enabled body-level interactive elements.
- [x] 4.5 Implement candidate ranking and explicit zero-candidate reporting.

## 5. OpenAI Verdict Pipeline

- [x] 5.1 Implement prompt builder using test metadata, failure evidence, candidate context, and OpenSpec clause.
- [x] 5.2 Implement live OpenAI call with `gpt-4o-mini` default model and structured response parsing.
- [x] 5.3 Support verdicts `HEAL`, `PRODUCT BUG`, and `SPEC OUTDATED` for failed runs.
- [x] 5.4 Store system prompt, user prompt, raw response, parsed response, usage metadata, duration, and estimated cost when available.
- [x] 5.5 Implement clear AI failure handling without silently substituting deterministic or precomputed verdicts.
- [x] 5.6 Block recovery verdict generation when OpenAI is not configured, and surface a retryable operational failure instead.

## 6. Validation, Rerun, and Output Generation

- [x] 6.1 Implement browser validation for `HEAL` candidate selectors.
- [x] 6.2 Generate and apply the safe locator patch to the target Playwright test file after candidate validation.
- [x] 6.3 Implement rerun proof from the patched Playwright test file and require `Payment Success`.
- [x] 6.4 Generate safe patch preview/applied diff only after validation, patch application, and rerun pass.
- [x] 6.5 Generate product bug report output when required OpenSpec behavior is missing.
- [x] 6.6 Generate operational error report output when the run fails before a recovery verdict.
- [x] 6.7 Ensure product bug output never claims that SpecHeal repaired product code.

## 7. Jira Integration

- [x] 7.1 Implement Jira configuration reader and readiness status for `JIRA_SITE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`, `JIRA_TASK_ISSUE_TYPE`, and `JIRA_BUG_ISSUE_TYPE`.
- [x] 7.2 Implement Jira Cloud create issue client using Atlassian email and API token.
- [x] 7.3 Build Atlassian Document Format descriptions for actionable terminal run result types.
- [x] 7.4 Persist `NO_HEAL_NEEDED` runs as audit reports without creating Jira issues by default.
- [x] 7.5 Auto-publish `HEAL` runs to Jira as patch review Tasks.
- [x] 7.6 Auto-publish `PRODUCT BUG` runs to Jira as Bugs.
- [x] 7.7 Auto-publish `SPEC OUTDATED` and operational error runs to Jira as Tasks.
- [x] 7.8 Persist Jira issue key, URL, issue ID, publish timestamp, and failure details.
- [x] 7.9 Implement retry publish endpoint for runs with `jira_publish_failed`.

## 8. Dashboard and Report UX

- [x] 8.1 Build main dashboard with project status, scenario picker, run CTA, and readiness indicators.
- [x] 8.2 Build run timeline showing Playwright result, evidence, OpenSpec clause, OpenAI verdict, proof/decision, and Jira publish result when applicable.
- [x] 8.3 Build evidence and output panels for screenshot, candidate summary, patch preview, product bug report, and Jira status.
- [x] 8.4 Build AI trace drawer showing prompt, raw output, parsed output, validation details, token usage, and cost estimate.
- [x] 8.5 Build full report page by run ID.
- [x] 8.6 Ensure failed OpenAI and failed Jira states are visible and understandable.
- [x] 8.7 Make healthy runs visibly report-only so users do not expect a Jira issue.

## 9. Kubernetes Deployment

- [x] 9.1 Create Dockerfile for a single app container that includes dashboard/API runtime, in-process runner, Jira/OpenAI clients, and Playwright browser dependencies.
- [x] 9.2 Create Kubernetes manifests for single app Deployment, Service, and optional Ingress.
- [x] 9.3 Create PostgreSQL deployment/service or document external PostgreSQL connection as the separate data service.
- [x] 9.4 Create Kubernetes Secret template for OpenAI, Jira, database, and runtime config.
- [ ] 9.5 Verify the deployed dashboard can reach OpenAI, Jira, PostgreSQL, and ShopFlow runtime routes.

## 10. Verification and Demo Readiness

- [ ] 10.1 Add tests for OpenSpec clause alignment and selector-agnostic ShopFlow requirements.
- [ ] 10.2 Add tests for DOM cleaning, candidate extraction, and zero-candidate behavior.
- [ ] 10.3 Add tests or scripted checks for Jira payload mapping.
- [ ] 10.4 Add tests or scripted checks proving no deterministic fallback is used when OpenAI is unavailable.
- [ ] 10.5 Add tests or scripted checks proving `NO_HEAL_NEEDED` creates a report without Jira publish.
- [ ] 10.6 Run Locator Drift scenario end-to-end with live OpenAI, applied test patch, rerun proof, and Jira Task creation.
- [ ] 10.7 Run Product Bug scenario end-to-end with live OpenAI and Jira Bug creation.
- [ ] 10.8 Verify recent runs and full report persist after reload.
- [ ] 10.9 Prepare a 5-minute demo script using the deployed Kubernetes URL.
