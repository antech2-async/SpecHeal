## Overview

This change improves the reviewer experience around the riskiest step in self-healing: selector candidate choice. The system should make candidate ranking explainable without expanding the MVP beyond ShopFlow Checkout.

## Candidate Evidence

Each candidate should include:

- stable locator suggestions such as `data-testid`, `data-test`, `data-cy`, `id`, `name`, `aria-label`, and placeholder when available,
- role, type, title, visible text, nearest label, row context, and container context,
- visibility/enabled state,
- rank score,
- ranking signal breakdown.

The prompt should include these fields so OpenAI has enough context to choose a safe selector from the provided candidates.

## UI Treatment

Candidate UI should show:

- score and selector kind,
- chosen selector/suggested locators,
- rank reason,
- contextual text/label/container/row evidence,
- visible/enabled state.

The report should also expose copy-friendly actions for:

- final output summary,
- patch diff,
- Jira issue/report text.

This keeps the app useful during judging and during real QA handoff.

## Jira Clarification

SpecHeal should keep its stronger live Jira publish behavior and only improve report readability/copy ergonomics in this slice.

## Non-Goals

- No Jira import flow.
- No new issue-publishing behavior.
- No arbitrary application testing.
- No product-code fixing.
