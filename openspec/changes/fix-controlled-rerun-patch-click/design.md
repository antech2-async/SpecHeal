## Overview

The HEAL flow separates judgment from execution:

- OpenAI decides whether the failure is a safe HEAL and selects one candidate selector from extracted evidence.
- SpecHeal validates that selector in the browser.
- SpecHeal generates and applies the controlled Playwright click line.
- The patched test reruns and must reach `Payment Success`.

The executable patch must not be copied from OpenAI because even a plausible-looking line can omit the actual click action.

## Patch Generation

`applySafeLocatorPatch` should synthesize the new line from the validated selector. It may still use OpenAI's explanation for reviewer context, but the code line itself should be canonical and checked to include a Playwright click.

The controlled test file may already contain a prior runtime patch. Before applying the new canonical line, SpecHeal should repair the known ShopFlow action region between navigation and success assertion back to the original controlled action. This keeps retry behavior stable after failed runs.

## UI Treatment

Patch preview remains safe-only: it should appear after validation, patch application, and rerun proof pass. If rerun fails, the UI should say the patch preview is blocked by proof failure rather than implying no patching step happened.

## Non-Goals

- No product-code fix.
- No automatic commit or merge.
- No change to live Jira publishing rules.
