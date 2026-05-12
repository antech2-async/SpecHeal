## Overview

This change upgrades SpecHeal's evidence model from "DOM was captured" to "the recovery decision is auditable." The implementation keeps the demo narrow: ShopFlow Checkout still drives the same three scenarios, but failed runs now carry a clearer evidence packet and a clearer AI usage/cost packet.

## Evidence Model

Failure evidence will contain:

- raw DOM length,
- cleaned DOM text,
- cleaned DOM length,
- removed DOM noise summary,
- visible page evidence,
- candidate elements,
- screenshot and Playwright error.

Visible page evidence should summarize:

- page title and URL,
- first visible body lines,
- payment-related section text,
- visible error or alert text,
- valid candidate count,
- notes such as "zero valid candidates" or "unavailable payment state".

DOM cleaning remains selector-agnostic and evidence-focused. It removes framework and non-user-facing noise such as `head`, `script`, `style`, `svg`, `iframe`, `canvas`, `template`, metadata, comments, classes, inline styles, and framework attributes. It masks sensitive values before prompt use and truncates long DOM with an explicit marker.

## AI Prompt and Cost Metadata

The OpenAI prompt should include visible evidence and DOM-cleaning metadata alongside candidate elements and the OpenSpec clause. This preserves the guardrail story:

```text
AI proposes. OpenSpec guards. Browser validates. Rerun proves.
```

Usage metadata should be captured from OpenAI when available:

- prompt tokens,
- cached prompt tokens when exposed by the API,
- completion tokens,
- total tokens,
- estimated cost,
- cost breakdown by input, cached input, and output where possible.

Cost estimates are display/audit metadata, not billing authority. The UI should label the pricing source and keep the estimate transparent.

## UI Treatment

The evidence UI should show the recovery story first, then allow deeper inspection:

- evidence metrics: raw DOM chars, cleaned DOM chars, candidate count,
- visible evidence: payment section, errors, body text, notes,
- DOM cleaning audit: removed noise tags/attributes and cleaned excerpt,
- AI trace summary: token/cost counter before raw prompt/response tabs.

This follows the project quality benchmark without copying product code or making the dependency visible in docs.

## Non-Goals

- No arbitrary website ingestion.
- No new Jira behavior.
- No product-code fixing.
- No database migration required for this slice; detailed usage/cost data can live in the persisted run report JSON while existing trace columns remain compatible.
