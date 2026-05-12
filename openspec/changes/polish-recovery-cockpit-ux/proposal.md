## Why

The current SpecHeal implementation proves the recovery pipeline end-to-end, but the UI underplays the most important demo moments: run progress, evidence inspection, trace audit, and target checkout feedback. This change raises the recovery cockpit polish so the product feels as trustworthy and complete as the backend workflow already is.

## What Changes

- Add an explicit dashboard running state that remains visible while orchestration is pending or running.
- Prevent duplicate run starts while a selected run is still active.
- Make the recovery sequence readable as a staged progress story before terminal results arrive.
- Improve the dashboard result layout so the recovery story is primary and deep evidence is secondary.
- Upgrade AI trace inspection from a basic disclosure block into a first-class audit surface.
- Add realistic ShopFlow checkout loading and payment-processing feedback without changing the seeded scenario semantics.
- Improve recent-run presentation and small UI polish issues that make the app feel unfinished.

## Capabilities

### New Capabilities
- `recovery-cockpit-ux`: Dashboard, run-state, trace, report, and demo-target user experience requirements for the recovery cockpit.

### Modified Capabilities

## Impact

- Affects the Next.js dashboard, run report components, ShopFlow demo route, and shared CSS.
- Does not change recovery verdict semantics, OpenAI prompt requirements, Jira publishing rules, PostgreSQL schema, Kubernetes manifests, or Playwright proof behavior.
- Requires regression checks for the existing three demo scenarios and UI checks across dashboard, report, and ShopFlow surfaces.
