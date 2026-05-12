import type { Page } from "playwright";
import type { ShopFlowScenario } from "@/demo/shopflow";

export type CandidateElement = {
  selector: string;
  selectorKind:
    | "testid"
    | "data-test"
    | "data-cy"
    | "id"
    | "name"
    | "aria-label"
    | "placeholder"
    | "role"
    | "text"
    | "css";
  tagName: string;
  text: string;
  visibleText: string;
  ariaLabel: string | null;
  testId: string | null;
  dataTest: string | null;
  dataCy: string | null;
  id: string | null;
  name: string | null;
  type: string | null;
  role: string | null;
  placeholder: string | null;
  title: string | null;
  nearestLabel: string | null;
  parentContext: string | null;
  rowContext: string | null;
  containerContext: string | null;
  suggestedLocators: string[];
  visible: boolean;
  enabled: boolean;
  rank: number;
  rankReason: string;
  rankSignals: string[];
};

export type FailureEvidence = {
  playwrightError: string;
  screenshotBase64: string;
  failedSelector: string;
  targetUrl: string;
  rawDomLength: number;
  cleanedDom: string;
  cleanedDomLength: number;
  domNoiseSummary: string[];
  visibleText: string;
  visibleEvidence: VisibleEvidence;
  candidates: CandidateElement[];
};

export type VisibleEvidence = {
  pageTitle: string;
  pageUrl: string;
  bodyText: string[];
  errorText: string;
  paymentSectionText: string;
  validCandidateCount: number;
  notes: string[];
};

export type CheckoutExecutionResult =
  | {
      passed: true;
      selectorUsed: string;
      targetUrl: string;
      durationMs: number;
    }
  | {
      passed: false;
      selectorUsed: string;
      targetUrl: string;
      durationMs: number;
      evidence: FailureEvidence;
    };

type ExecuteCheckoutOptions = {
  scenario: ShopFlowScenario;
  targetUrl: string;
};

type CandidateFromPage = Omit<CandidateElement, "rank" | "rankReason" | "rankSignals">;
type CleanDomResult = {
  html: string;
  cleanedLength: number;
  removed: string[];
};

const CLEANED_DOM_MAX_CHARS = 8000;
const TRUNCATION_MARKER = "<!-- [Cleaned DOM truncated for prompt budget] -->";

export async function executeCheckoutAttempt({
  scenario,
  targetUrl
}: ExecuteCheckoutOptions): Promise<CheckoutExecutionResult> {
  const { chromium } = await import("playwright");
  const startedAt = performance.now();
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false"
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    try {
      await page.click(scenario.oldSelector, { timeout: 2000 });
      await page
        .getByText(scenario.expectedText, { exact: true })
        .waitFor({ timeout: 3000 });

      return {
        passed: true,
        selectorUsed: scenario.oldSelector,
        targetUrl: page.url(),
        durationMs: elapsedMs(startedAt)
      };
    } catch (error) {
      return {
        passed: false,
        selectorUsed: scenario.oldSelector,
        targetUrl: page.url(),
        durationMs: elapsedMs(startedAt),
        evidence: await captureFailureEvidence(page, scenario, error)
      };
    }
  } finally {
    await browser.close();
  }
}

async function captureFailureEvidence(
  page: Page,
  scenario: ShopFlowScenario,
  error: unknown
): Promise<FailureEvidence> {
  const screenshot = await page.screenshot({ fullPage: true, type: "png" });
  const rawDom = await page.content();
  const candidates = rankCandidates(
    await extractCandidateElements(page),
    scenario
  );
  const visibleEvidence = await extractVisibleEvidence(page, candidates.length);
  const visibleText = visibleEvidence.bodyText.join("\n");
  const cleaned = cleanDomForAi(rawDom);

  return {
    playwrightError:
      error instanceof Error ? error.message : "Unknown Playwright failure",
    screenshotBase64: screenshot.toString("base64"),
    failedSelector: scenario.oldSelector,
    targetUrl: page.url(),
    rawDomLength: rawDom.length,
    cleanedDom: cleaned.html,
    cleanedDomLength: cleaned.cleanedLength,
    domNoiseSummary: cleaned.removed,
    visibleText,
    visibleEvidence,
    candidates
  };
}

async function extractCandidateElements(page: Page): Promise<CandidateFromPage[]> {
  return page.evaluate(() => {
    const stableSelectorFor = (element: Element) => {
      const testId = element.getAttribute("data-testid");
      const dataTest = element.getAttribute("data-test");
      const dataCy = element.getAttribute("data-cy");
      const id = element.id;
      const name = element.getAttribute("name");
      const ariaLabel = element.getAttribute("aria-label");
      const placeholder = element.getAttribute("placeholder");
      const role = element.getAttribute("role");
      const text = (element.textContent ?? "").trim().replace(/\s+/g, " ");
      const tagName = element.tagName.toLowerCase();
      const suggestedLocators: string[] = [];

      const pushLocator = (locator: string | null) => {
        if (locator && !suggestedLocators.includes(locator)) {
          suggestedLocators.push(locator);
        }
      };

      if (testId) {
        pushLocator(`[data-testid="${CSS.escape(testId)}"]`);
      }

      if (dataTest) {
        pushLocator(`[data-test="${CSS.escape(dataTest)}"]`);
      }

      if (dataCy) {
        pushLocator(`[data-cy="${CSS.escape(dataCy)}"]`);
      }

      if (id) {
        pushLocator(`#${CSS.escape(id)}`);
      }

      if (name) {
        pushLocator(`[name="${CSS.escape(name)}"]`);
      }

      if (ariaLabel) {
        pushLocator(`[aria-label="${CSS.escape(ariaLabel)}"]`);
      }

      if (placeholder) {
        pushLocator(`[placeholder="${CSS.escape(placeholder)}"]`);
      }

      if (role && text) {
        pushLocator(`role=${role}[name="${text.replace(/"/g, '\\"')}"]`);
      }

      if (tagName === "button" && text) {
        pushLocator(`text=${text}`);
      }

      if (testId) {
        return {
          selector: `[data-testid="${CSS.escape(testId)}"]`,
          selectorKind: "testid" as const,
          suggestedLocators
        };
      }

      if (dataTest) {
        return {
          selector: `[data-test="${CSS.escape(dataTest)}"]`,
          selectorKind: "data-test" as const,
          suggestedLocators
        };
      }

      if (dataCy) {
        return {
          selector: `[data-cy="${CSS.escape(dataCy)}"]`,
          selectorKind: "data-cy" as const,
          suggestedLocators
        };
      }

      if (id) {
        return {
          selector: `#${CSS.escape(id)}`,
          selectorKind: "id" as const,
          suggestedLocators
        };
      }

      if (name) {
        return {
          selector: `[name="${CSS.escape(name)}"]`,
          selectorKind: "name" as const,
          suggestedLocators
        };
      }

      if (ariaLabel) {
        return {
          selector: `[aria-label="${CSS.escape(ariaLabel)}"]`,
          selectorKind: "aria-label" as const,
          suggestedLocators
        };
      }

      if (placeholder) {
        return {
          selector: `[placeholder="${CSS.escape(placeholder)}"]`,
          selectorKind: "placeholder" as const,
          suggestedLocators
        };
      }

      if (role && text) {
        return {
          selector: `role=${role}[name="${text.replace(/"/g, '\\"')}"]`,
          selectorKind: "role" as const,
          suggestedLocators
        };
      }

      if (tagName === "button" && text) {
        return {
          selector: `text=${text}`,
          selectorKind: "text" as const,
          suggestedLocators
        };
      }

      return {
        selector: tagName,
        selectorKind: "css" as const,
        suggestedLocators
      };
    };

    const nodes = Array.from(
      document.body.querySelectorAll(
        [
          "button",
          "a[href]",
          "input",
          "textarea",
          "select",
          "[role='button']",
          "[role='link']",
          "[role='menuitem']",
          "[role='tab']",
          "[role='checkbox']",
          "[role='radio']",
          "[role='switch']",
          "[data-testid]",
          "[data-test]",
          "[data-cy]",
          "[aria-label]",
          "[name]",
          "[placeholder]"
        ].join(",")
      )
    );

    return nodes
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const tagName = element.tagName.toLowerCase();
        const disabled =
          element.hasAttribute("disabled") ||
          element.getAttribute("aria-disabled") === "true";
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          Number(style.opacity) !== 0;
        const selector = stableSelectorFor(element);
        const text = (element.textContent ?? "").trim().replace(/\s+/g, " ");
        const visibleText =
          (element as HTMLElement).innerText?.trim().replace(/\s+/g, " ") ||
          text;
        const id = element.id || null;
        const labelFor = id
          ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
          : null;
        const nearestLabel =
          labelFor?.textContent?.trim().replace(/\s+/g, " ").slice(0, 100) ||
          element.closest("label")?.textContent?.trim().replace(/\s+/g, " ").slice(0, 100) ||
          null;
        const parent = element.parentElement;
        const parentContext = parent
          ? [
              parent.tagName.toLowerCase(),
              parent.id ? `#${parent.id}` : "",
              parent.getAttribute("role") ? `[role="${parent.getAttribute("role")}"]` : ""
            ].join("")
          : null;
        const row = element.closest("tr, li");
        let rowContext: string | null = null;

        if (row) {
          const clone = row.cloneNode(true) as HTMLElement;
          clone
            .querySelectorAll("button, a, input, textarea, select")
            .forEach((child) => child.remove());
          rowContext =
            clone.innerText?.trim().replace(/\s+/g, " ").slice(0, 180) || null;
        }

        const container = element.closest(
          "section, form, aside, main, article, [role='dialog'], [role='complementary']"
        );
        const heading = container?.querySelector("h1, h2, h3, [aria-label]");
        const headingText =
          (heading as HTMLElement | null)?.innerText ||
          heading?.getAttribute("aria-label") ||
          heading?.textContent ||
          "";
        const containerContext = container
          ? `${container.tagName.toLowerCase()}${headingText ? `: ${headingText.trim().replace(/\s+/g, " ").slice(0, 100)}` : ""}`
          : null;

        return {
          ...selector,
          tagName,
          text,
          visibleText,
          ariaLabel: element.getAttribute("aria-label"),
          testId: element.getAttribute("data-testid"),
          dataTest: element.getAttribute("data-test"),
          dataCy: element.getAttribute("data-cy"),
          id,
          name: element.getAttribute("name"),
          type: element.getAttribute("type"),
          role: element.getAttribute("role"),
          placeholder: element.getAttribute("placeholder"),
          title: element.getAttribute("title"),
          nearestLabel,
          parentContext,
          rowContext,
          containerContext,
          visible,
          enabled: !disabled
        };
      })
      .filter((candidate) => {
        const clickRoles = new Set([
          "button",
          "link",
          "menuitem",
          "tab",
          "checkbox",
          "radio",
          "switch"
        ]);
        const interactiveTags = new Set([
          "button",
          "a",
          "input",
          "textarea",
          "select"
        ]);
        const stableTestTarget = Boolean(
          candidate.testId || candidate.dataTest || candidate.dataCy
        );
        const actionable =
          interactiveTags.has(candidate.tagName) ||
          clickRoles.has(candidate.role ?? "") ||
          stableTestTarget;

        return candidate.visible && candidate.enabled && actionable;
      });
  });
}

function cleanDomForAi(rawHtml: string, maxChars = CLEANED_DOM_MAX_CHARS): CleanDomResult {
  const removed = new Set<string>();
  let html = rawHtml;

  html = html.replace(/<!doctype[^>]*>/gi, () => {
    removed.add("doctype");
    return "";
  });

  html = html.replace(/<head[\s\S]*?<\/head>/gi, () => {
    removed.add("head");
    return "";
  });

  for (const tag of ["script", "style", "svg", "noscript", "iframe", "canvas", "template"]) {
    const pattern = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi");
    html = html.replace(pattern, () => {
      removed.add(tag);
      return "";
    });
  }

  for (const tag of ["meta", "link"]) {
    const pattern = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    html = html.replace(pattern, () => {
      removed.add(tag);
      return "";
    });
  }

  html = html.replace(/<!--[\s\S]*?-->/g, () => {
    removed.add("comments");
    return "";
  });

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (bodyMatch) {
    removed.add("html/body shell");
    html = bodyMatch[1] ?? "";
  }

  html = html
    .replace(/\s(?:class|style|data-nextjs-[a-z0-9_-]+|data-reactroot)="[^"]*"/gi, () => {
      removed.add("presentation/framework attributes");
      return "";
    })
    .replace(/\s(?:class|style|data-nextjs-[a-z0-9_-]+|data-reactroot)='[^']*'/gi, () => {
      removed.add("presentation/framework attributes");
      return "";
    })
    .replace(/\svalue="[^"]*"/gi, () => {
      removed.add("input values");
      return ' value="[masked]"';
    })
    .replace(/\svalue='[^']*'/gi, () => {
      removed.add("input values");
      return " value=\"[masked]\"";
    });

  html = maskSensitiveText(html)
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (html.length > maxChars) {
    removed.add("prompt-budget truncation");
    html = `${html.slice(0, maxChars)}\n${TRUNCATION_MARKER}`;
  }

  return {
    html,
    cleanedLength: html.length,
    removed: Array.from(removed)
  };
}

async function extractVisibleEvidence(
  page: Page,
  validCandidateCount: number
): Promise<VisibleEvidence> {
  const payload = await page.evaluate(() => {
    const normalizedText = (value: string | null | undefined) =>
      (value ?? "").trim().replace(/\s+/g, " ");
    const bodyLines = (document.body?.innerText ?? "")
      .split("\n")
      .map((line) => normalizedText(line))
      .filter(Boolean)
      .slice(0, 24);
    const errorText = Array.from(
      document.body.querySelectorAll(
        [
          "[role='alert']",
          "[aria-live]",
          ".error",
          ".alert",
          "[class*='red']",
          "[class*='danger']",
          "[data-testid*='error']"
        ].join(",")
      )
    )
      .map((node) => normalizedText(node.textContent))
      .filter(Boolean)
      .slice(0, 6)
      .join(" | ");
    const paymentSection = Array.from(
      document.body.querySelectorAll("section, main, form, article, div")
    )
      .map((node) => normalizedText(node.textContent))
      .filter((text) => /pay|payment|checkout|complete|unavailable|success/i.test(text))
      .sort((left, right) => left.length - right.length)[0];

    return {
      pageTitle: document.title,
      pageUrl: window.location.href,
      bodyText: bodyLines,
      errorText,
      paymentSectionText: paymentSection?.slice(0, 700) ?? ""
    };
  });
  const notes: string[] = [];

  if (validCandidateCount === 0) {
    notes.push("No valid visible and enabled payment candidates were found.");
  }

  if (/unavailable|disabled|cannot|missing/i.test(payload.paymentSectionText)) {
    notes.push("Visible payment evidence suggests the required action is unavailable.");
  }

  if (payload.errorText) {
    notes.push("Visible error or alert text was present on the failed page.");
  }

  return {
    pageTitle: maskSensitiveText(payload.pageTitle),
    pageUrl: payload.pageUrl,
    bodyText: payload.bodyText.map(maskSensitiveText),
    errorText: maskSensitiveText(payload.errorText),
    paymentSectionText: maskSensitiveText(payload.paymentSectionText),
    validCandidateCount,
    notes
  };
}

function rankCandidates(
  candidates: CandidateFromPage[],
  scenario: ShopFlowScenario
): CandidateElement[] {
  return candidates
    .map((candidate) => {
      const searchable = [
        candidate.text,
        candidate.visibleText,
        candidate.ariaLabel,
        candidate.testId,
        candidate.dataTest,
        candidate.dataCy,
        candidate.id,
        candidate.name,
        candidate.placeholder,
        candidate.role,
        candidate.nearestLabel,
        candidate.parentContext,
        candidate.rowContext,
        candidate.containerContext,
        candidate.selector,
        candidate.suggestedLocators.join(" ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const keywordMatches = scenario.intentKeywords.filter((keyword) =>
        searchable.includes(keyword.toLowerCase())
      ).length;
      const oldSelectorTokenMatches = overlap(
        selectorTokens(scenario.oldSelector),
        tokenize(searchable)
      );
      const stepTokenMatches = overlap(
        tokenize(scenario.stepName),
        tokenize(searchable)
      );
      const stabilityScore =
        candidate.selectorKind === "testid"
          ? 30
          : candidate.selectorKind === "data-test" ||
              candidate.selectorKind === "data-cy"
            ? 26
            : candidate.selectorKind === "id"
              ? 20
              : candidate.selectorKind === "name" ||
                  candidate.selectorKind === "aria-label"
                ? 15
                : candidate.selectorKind === "role"
                  ? 12
                  : 5;
      const contextScore =
        (candidate.nearestLabel ? 4 : 0) +
        (candidate.containerContext ? 4 : 0) +
        (candidate.rowContext ? 3 : 0);
      const actionabilityScore = candidate.visible && candidate.enabled ? 10 : -30;
      const rank =
        stabilityScore +
        actionabilityScore +
        keywordMatches * 10 +
        oldSelectorTokenMatches * 8 +
        stepTokenMatches * 6 +
        contextScore;
      const rankSignals = [
        `${stabilityScore} stable locator (${candidate.selectorKind})`,
        `${actionabilityScore} visible/enabled actionability`,
        keywordMatches > 0
          ? `${keywordMatches * 10} payment intent score (${keywordMatches} keyword match)`
          : "0 payment intent score",
        oldSelectorTokenMatches > 0
          ? `${oldSelectorTokenMatches * 8} old-selector token overlap`
          : "0 old-selector token overlap",
        stepTokenMatches > 0
          ? `${stepTokenMatches * 6} step-name token overlap`
          : "0 step-name token overlap",
        contextScore > 0
          ? `${contextScore} surrounding context score`
          : "0 surrounding context score"
      ];

      return {
        ...candidate,
        rank,
        rankSignals,
        rankReason:
          keywordMatches > 0
            ? `Matched ${keywordMatches} payment intent keyword(s) with ${candidate.selectorKind} locator stability.`
            : `Visible and enabled with ${candidate.selectorKind} locator stability, but no payment intent keyword matched.`
      };
    })
    .sort((left, right) => right.rank - left.rank);
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/[\s_-]+/)
    .filter((token) => token.length > 1);
}

function selectorTokens(selector: string) {
  return tokenize(selector.replace(/[#.[\]='":>~+()]/g, " "));
}

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((token) => rightSet.has(token)).length;
}

function maskSensitiveText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[masked-email]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[masked-card]");
}

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}
