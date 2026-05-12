import { execFile } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Page } from "playwright";
import type { ShopFlowScenario } from "@/demo/shopflow";
import { getAppBaseUrl } from "@/lib/env";
import type { RecoveryVerdict } from "./openai-verdict";

const execFileAsync = promisify(execFile);

export type CandidateValidation = {
  selector: string;
  passed: boolean;
  elementCount: number;
  reason: string;
};

export type AppliedPatch = {
  filePath: string;
  oldLine: string;
  newLine: string;
  appliedDiff: string;
  explanation: string;
  applied: boolean;
};

export type RerunProof = {
  testFilePath: string;
  selector: string;
  passed: boolean;
  expectedText: string;
  durationMs: number;
  errorMessage?: string;
};

export async function validateHealCandidate(options: {
  scenario: ShopFlowScenario;
  targetUrl: string;
  selector: string | null;
}): Promise<CandidateValidation> {
  if (!options.selector) {
    return {
      selector: "",
      passed: false,
      elementCount: 0,
      reason: "OpenAI did not return a candidate selector for HEAL."
    };
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false"
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(options.targetUrl, { waitUntil: "networkidle" });
    const locator = locatorForSelector(page, options.selector);
    const elementCount = await locator.count();

    if (elementCount !== 1) {
      return {
        selector: options.selector,
        passed: false,
        elementCount,
        reason: `Candidate selector must match exactly one element, but matched ${elementCount}.`
      };
    }

    const visible = await locator.first().isVisible();
    const enabled = await locator.first().isEnabled();

    if (!visible || !enabled) {
      return {
        selector: options.selector,
        passed: false,
        elementCount,
        reason: "Candidate selector is not visible and enabled."
      };
    }

    await locator.first().click({ trial: true, timeout: 1500 });

    return {
      selector: options.selector,
      passed: true,
      elementCount,
      reason:
        "Candidate matches one visible and enabled element and can accept the checkout action."
    };
  } catch (error) {
    return {
      selector: options.selector,
      passed: false,
      elementCount: 0,
      reason: error instanceof Error ? error.message : "Candidate validation failed."
    };
  } finally {
    await browser.close();
  }
}

export async function applySafeLocatorPatch(options: {
  scenario: ShopFlowScenario;
  selector: string;
  verdict: RecoveryVerdict;
}): Promise<AppliedPatch> {
  if (!options.scenario.patch) {
    throw new Error("Scenario does not define a controlled Playwright patch target.");
  }

  const filePath = options.scenario.patch.file;
  const absolutePath = resolveControlledTestFile(filePath);
  const oldLine = options.scenario.patch.oldLine;
  const newLine = selectorToPlaywrightClickLine(options.selector);

  await access(absolutePath);
  let source = await readFile(absolutePath, "utf8");
  source = repairControlledActionRegion(source, oldLine);

  if (!source.includes(oldLine)) {
    throw new Error(`Controlled test patch target was not found: ${oldLine}`);
  }

  assertControlledClickLine(newLine);

  const patched = source.replace(oldLine, newLine);
  await writeFile(absolutePath, patched, "utf8");

  return {
    filePath,
    oldLine,
    newLine,
    appliedDiff: [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      "@@",
      `- ${oldLine}`,
      `+ ${newLine}`
    ].join("\n"),
    explanation:
      options.verdict.patch?.explanation ||
      "The locator patch changes only the controlled Playwright checkout action.",
    applied: true
  };
}

export async function runPatchedCheckoutProof(options: {
  scenario: ShopFlowScenario;
  selector: string;
}): Promise<RerunProof> {
  if (!options.scenario.patch) {
    throw new Error("Scenario does not define a controlled Playwright test file.");
  }

  const startedAt = performance.now();
  const testFilePath = options.scenario.patch.file;
  const cliPath = path.join(process.cwd(), "node_modules", "playwright", "cli.js");

  try {
    await execFileAsync(
      process.execPath,
      [cliPath, "test", testFilePath, "--reporter=line"],
      {
        cwd: process.cwd(),
        timeout: 60_000,
        env: {
          ...process.env,
          NEXT_PUBLIC_BASE_URL: getAppBaseUrl(),
          PLAYWRIGHT_OUTPUT_DIR:
            process.env.PLAYWRIGHT_OUTPUT_DIR || "/tmp/specheal-test-results",
          SHOPFLOW_STATE: options.scenario.runtimeState,
          PLAYWRIGHT_HEADLESS: String(process.env.PLAYWRIGHT_HEADLESS ?? "true")
        }
      }
    );

    return {
      testFilePath,
      selector: options.selector,
      passed: true,
      expectedText: options.scenario.expectedText,
      durationMs: elapsedMs(startedAt)
    };
  } catch (error) {
    return {
      testFilePath,
      selector: options.selector,
      passed: false,
      expectedText: options.scenario.expectedText,
      durationMs: elapsedMs(startedAt),
      errorMessage: formatExecError(error)
    };
  }
}

export function buildSafeHealOutput(options: {
  scenario: ShopFlowScenario;
  validation: CandidateValidation;
  patch: AppliedPatch;
  rerun: RerunProof;
}) {
  return {
    kind: "safe_heal" as const,
    title: "Review safe ShopFlow checkout locator patch",
    summary:
      "SpecHeal validated the replacement checkout action, applied the controlled Playwright test patch, and proved the patched test reaches Payment Success.",
    recommendedAction:
      "Review the generated test locator patch and apply it through the normal human review process.",
    evidence: [
      `Validated selector: ${options.validation.selector}`,
      `Patch target: ${options.patch.filePath}`,
      `Rerun proof: ${options.rerun.expectedText}`
    ],
    safetyNote:
      "SpecHeal changed only the controlled Playwright test file and did not modify product implementation code."
  };
}

export function buildProductBugOutput(options: {
  scenario: ShopFlowScenario;
  verdict: RecoveryVerdict;
  visibleText: string;
}) {
  return {
    kind: "product_bug" as const,
    title:
      options.verdict.jiraReport?.title ||
      "Checkout payment action missing from ShopFlow checkout",
    summary:
      options.verdict.jiraReport?.summary ||
      "The checkout payment test failed because the payment action required by OpenSpec is missing or unavailable.",
    recommendedAction:
      options.verdict.jiraReport?.recommendedAction ||
      "Restore the payment CTA or update the ShopFlow OpenSpec if the checkout flow intentionally changed.",
    evidence:
      options.verdict.jiraReport?.evidence.length
        ? options.verdict.jiraReport.evidence
        : [
            `Scenario: ${options.scenario.title}`,
            `Visible page evidence: ${options.visibleText.slice(0, 300)}`
          ],
    safetyNote:
      "No selector patch is generated because this is treated as a product behavior escalation, not a repaired product bug."
  };
}

export function buildSpecOutdatedOutput(options: {
  scenario: ShopFlowScenario;
  verdict: RecoveryVerdict;
}) {
  return {
    kind: "spec_outdated" as const,
    title:
      options.verdict.jiraReport?.title ||
      "Review ShopFlow checkout test and OpenSpec alignment",
    summary:
      options.verdict.jiraReport?.summary ||
      "OpenAI determined that selector replacement is insufficient because the test or spec may no longer match intended behavior.",
    recommendedAction:
      options.verdict.jiraReport?.recommendedAction ||
      "Review the ShopFlow checkout requirement and update the test/spec mapping through normal review.",
    evidence:
      options.verdict.jiraReport?.evidence.length
        ? options.verdict.jiraReport.evidence
        : [`Scenario: ${options.scenario.title}`, options.verdict.reason],
    safetyNote:
      "No patch is marked safe until the intended behavior is clarified."
  };
}

export function buildOperationalErrorOutput(options: {
  stage: string;
  message: string;
  scenarioTitle?: string;
}) {
  return {
    kind: "operational_error" as const,
    title: "Investigate SpecHeal recovery run failure",
    summary: `SpecHeal could not complete the recovery run at stage ${options.stage}.`,
    recommendedAction:
      "Check runtime configuration, service reachability, and stored trace details, then retry the run.",
    evidence: [
      options.scenarioTitle ? `Scenario: ${options.scenarioTitle}` : "",
      `Failed stage: ${options.stage}`,
      `Error: ${options.message}`
    ].filter(Boolean),
    safetyNote:
      "No recovery verdict or patch should be trusted for this run until the operational failure is resolved."
  };
}

function selectorToPlaywrightClickLine(selector: string) {
  const testId = selector.match(/^\[data-testid="([^"]+)"\]$/)?.[1];
  const dataTest = selector.match(/^\[data-test="([^"]+)"\]$/)?.[1];
  const dataCy = selector.match(/^\[data-cy="([^"]+)"\]$/)?.[1];
  const name = selector.match(/^\[name="([^"]+)"\]$/)?.[1];
  const ariaLabel = selector.match(/^\[aria-label="([^"]+)"\]$/)?.[1];
  const placeholder = selector.match(/^\[placeholder="([^"]+)"\]$/)?.[1];
  const text = selector.match(/^text=(.+)$/)?.[1];
  const role = selector.match(/^role=([a-zA-Z]+)\[name="(.+)"\]$/);

  if (testId) {
    return `await page.getByTestId(${JSON.stringify(testId)}).click();`;
  }

  if (role) {
    return `await page.getByRole(${JSON.stringify(role[1])}, { name: ${JSON.stringify(role[2].replace(/\\"/g, '"'))} }).click();`;
  }

  if (text) {
    return `await page.getByText(${JSON.stringify(text)}, { exact: true }).click();`;
  }

  if (dataTest) {
    return `await page.locator(${JSON.stringify(`[data-test="${dataTest}"]`)}).click();`;
  }

  if (dataCy) {
    return `await page.locator(${JSON.stringify(`[data-cy="${dataCy}"]`)}).click();`;
  }

  if (name) {
    return `await page.locator(${JSON.stringify(`[name="${name}"]`)}).click();`;
  }

  if (ariaLabel) {
    return `await page.locator(${JSON.stringify(`[aria-label="${ariaLabel}"]`)}).click();`;
  }

  if (placeholder) {
    return `await page.locator(${JSON.stringify(`[placeholder="${placeholder}"]`)}).click();`;
  }

  return `await page.locator(${JSON.stringify(selector)}).click();`;
}

function repairControlledActionRegion(source: string, oldLine: string) {
  if (source.includes(oldLine)) {
    return source;
  }

  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(/\r?\n/);
  const gotoIndex = lines.findIndex((line) =>
    line.includes("await page.goto(`/shopflow?state=${shopflowState}`);")
  );
  const expectIndex = lines.findIndex(
    (line, index) =>
      index > gotoIndex &&
      line.includes('await expect(page.getByText("Payment Success")).toBeVisible();')
  );

  if (gotoIndex === -1 || expectIndex === -1 || expectIndex <= gotoIndex) {
    return source;
  }

  const indent = lines[gotoIndex]?.match(/^\s*/)?.[0] || "  ";

  return [
    ...lines.slice(0, gotoIndex + 1),
    `${indent}${oldLine}`,
    ...lines.slice(expectIndex)
  ].join(newline);
}

function assertControlledClickLine(line: string) {
  if (!/^await page\..+\.click\(\);$/.test(line)) {
    throw new Error(`Refusing to apply non-click Playwright patch line: ${line}`);
  }
}

function resolveControlledTestFile(filePath: string) {
  if (filePath !== "tests/shopflow-checkout.spec.ts") {
    throw new Error(`Refusing to patch unmanaged test file: ${filePath}`);
  }

  return path.join(process.cwd(), "tests", "shopflow-checkout.spec.ts");
}

function locatorForSelector(page: Page, selector: string) {
  const text = selector.match(/^text=(.+)$/)?.[1];
  const role = selector.match(/^role=([a-zA-Z]+)\[name="(.+)"\]$/);

  if (text) {
    return page.getByText(text, { exact: true });
  }

  if (role) {
    return page.getByRole(role[1] as "button", {
      name: role[2].replace(/\\"/g, '"')
    });
  }

  return page.locator(selector);
}

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function formatExecError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Patched Playwright rerun failed.";
  }

  const details = error as Error & {
    stderr?: string;
    stdout?: string;
  };
  const output = [details.message, details.stdout, details.stderr]
    .filter(Boolean)
    .join("\n")
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
    .trim();

  return output || "Patched Playwright rerun failed.";
}
