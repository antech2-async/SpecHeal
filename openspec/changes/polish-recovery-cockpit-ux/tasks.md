## 1. Running State and Dashboard Flow

- [x] 1.1 Add a dedicated dashboard running view with staged recovery progress.
- [x] 1.2 Disable duplicate run submission while the current run is pending or running.
- [x] 1.3 Rework recent runs into a compact secondary navigation strip and clean small display artifacts.

## 2. Report and Trace Polish

- [x] 2.1 Rebalance the dashboard report layout around verdict, timeline, proof, and Jira outcome first.
- [x] 2.2 Upgrade AI trace inspection into organized sections for summary, prompts, raw response, parsed response, and validation/proof context.
- [x] 2.3 Preserve full report audit detail while improving scan order and empty/running states.

## 3. ShopFlow Interaction Feedback

- [x] 3.1 Add short checkout loading feedback before payment controls are available.
- [x] 3.2 Add payment-processing feedback for healthy and locator-drift payment actions.
- [x] 3.3 Confirm the product-bug state still exposes no valid payment action.

## 4. Regression and Demo Verification

- [x] 4.1 Run OpenSpec validation for the UI polish change.
- [x] 4.2 Run lint and automated tests covering existing recovery behavior.
- [x] 4.3 Run Playwright/UI checks for dashboard, full report, ShopFlow, and mobile layout.
- [x] 4.4 Document GHCR/Kubernetes update command sequence after the verified changes.
- [x] 4.5 Add API private-network preflight headers for deployed browser compatibility.

## 5. Recovery Cockpit Refinement Pass

- [x] 5.1 Add a compact demo status strip that reflects selected scenario and current run state.
- [x] 5.2 Convert AI trace inspection into a drawer/modal audit surface with tabbed content.
- [x] 5.3 Tighten cockpit visual hierarchy, result actions, and diagnostic card density.
- [x] 5.4 Re-run validation, lint, typecheck, production build, and UI smoke checks after the final polish pass.
