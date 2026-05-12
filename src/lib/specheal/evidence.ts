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
  visibleText: string;
  candidates: CandidateElement[];
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
  const visibleText = maskSensitiveText(await getVisibleText(page));
  const cleanedDom = await getCleanedDom(page);
  const candidates = rankCandidates(
    await extractCandidateElements(page),
    scenario.intentKeywords
  );

  return {
    playwrightError:
      error instanceof Error ? error.message : "Unknown Playwright failure",
    screenshotBase64: screenshot.toString("base64"),
    failedSelector: scenario.oldSelector,
    targetUrl: page.url(),
    rawDomLength: rawDom.length,
    cleanedDom,
    cleanedDomLength: cleanedDom.length,
    visibleText,
    candidates
  };
}

async function getVisibleText(page: Page) {
  return page.evaluate(() => document.body?.innerText ?? "");
}

async function getCleanedDom(page: Page) {
  const cleaned = await page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    const noiseSelector = [
      "head",
      "script",
      "style",
      "meta",
      "link",
      "noscript",
      "svg",
      "iframe",
      "canvas",
      "template"
    ].join(",");

    clone.querySelectorAll(noiseSelector).forEach((node) => node.remove());

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const comments: Comment[] = [];
    let node = walker.nextNode();

    while (node) {
      comments.push(node as Comment);
      node = walker.nextNode();
    }

    comments.forEach((comment) => comment.remove());

    clone.querySelectorAll("input, textarea").forEach((node) => {
      node.setAttribute("value", "[masked]");
    });

    return clone.innerHTML;
  });

  return maskSensitiveText(cleaned)
    .replace(/\s{2,}/g, " ")
    .replace(/value="[^"]*"/gi, 'value="[masked]"')
    .trim();
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
