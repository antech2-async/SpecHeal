import type { Page } from "playwright";
import type { ShopFlowScenario } from "@/demo/shopflow";

export type CandidateElement = {
  selector: string;
  selectorKind: "testid" | "id" | "aria-label" | "role" | "text" | "css";
  tagName: string;
  text: string;
  ariaLabel: string | null;
  testId: string | null;
  id: string | null;
  visible: boolean;
  enabled: boolean;
  rank: number;
  rankReason: string;
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

type CandidateFromPage = Omit<CandidateElement, "rank" | "rankReason">;
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
    scenario.intentKeywords
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
      const id = element.id;
      const ariaLabel = element.getAttribute("aria-label");
      const role = element.getAttribute("role");
      const text = (element.textContent ?? "").trim().replace(/\s+/g, " ");
      const tagName = element.tagName.toLowerCase();

      if (testId) {
        return {
          selector: `[data-testid="${CSS.escape(testId)}"]`,
          selectorKind: "testid" as const
        };
      }

      if (id) {
        return {
          selector: `#${CSS.escape(id)}`,
          selectorKind: "id" as const
        };
      }

      if (ariaLabel) {
        return {
          selector: `[aria-label="${CSS.escape(ariaLabel)}"]`,
          selectorKind: "aria-label" as const
        };
      }

      if (role && text) {
        return {
          selector: `role=${role}[name="${text.replace(/"/g, '\\"')}"]`,
          selectorKind: "role" as const
        };
      }

      if (tagName === "button" && text) {
        return {
          selector: `text=${text}`,
          selectorKind: "text" as const
        };
      }

      return {
        selector: tagName,
        selectorKind: "css" as const
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
          "[role='button']"
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

        return {
          ...selector,
          tagName,
          text: (element.textContent ?? "").trim().replace(/\s+/g, " "),
          ariaLabel: element.getAttribute("aria-label"),
          testId: element.getAttribute("data-testid"),
          id: element.id || null,
          visible,
          enabled: !disabled
        };
      })
      .filter((candidate) => candidate.visible && candidate.enabled);
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
  intentKeywords: string[]
): CandidateElement[] {
  return candidates
    .map((candidate) => {
      const searchable = [
        candidate.text,
        candidate.ariaLabel,
        candidate.testId,
        candidate.id,
        candidate.selector
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const keywordMatches = intentKeywords.filter((keyword) =>
        searchable.includes(keyword.toLowerCase())
      ).length;
      const stabilityScore =
        candidate.selectorKind === "testid"
          ? 30
          : candidate.selectorKind === "id"
            ? 20
            : candidate.selectorKind === "aria-label"
              ? 15
              : 5;
      const rank = stabilityScore + keywordMatches * 10;

      return {
        ...candidate,
        rank,
        rankReason:
          keywordMatches > 0
            ? `Matched ${keywordMatches} payment intent keyword(s).`
            : "Visible and enabled, but no payment intent keyword matched."
      };
    })
    .sort((left, right) => right.rank - left.rank);
}

function maskSensitiveText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[masked-email]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[masked-card]");
}

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}
