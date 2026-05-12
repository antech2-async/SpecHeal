export type ShopFlowScenarioId = "healthy-flow" | "locator-drift" | "product-bug";
export type ShopFlowRuntimeState = "normal" | "drift" | "bug";

export type ShopFlowScenario = {
  id: ShopFlowScenarioId;
  runtimeState: ShopFlowRuntimeState;
  title: string;
  label: string;
  summary: string;
  oldSelector: string;
  currentSelector: string | null;
  expectedText: string;
  testName: string;
  stepName: string;
  intentKeywords: string[];
  patch: {
    file: string;
    oldLine: string;
    newLine: string;
    explanation: string;
  } | null;
};

export const SHOPFLOW_PROJECT = {
  id: "shopflow-checkout",
  name: "ShopFlow Checkout",
  suiteName: "checkout-payment.spec.ts",
  targetPath: "/shopflow",
  targetOpenSpecPath:
    "openspec/changes/build-specheal-recovery-cockpit/specs/shopflow-checkout/spec.md"
};

export const SHOPFLOW_OPENSPEC_CLAUSE = `Requirement: Checkout payment completion
The ShopFlow Checkout application SHALL allow a user with items in the cart to complete payment from the checkout page when payment is available.

Scenario: Successful payment
- WHEN the checkout page is ready and the user confirms payment
- THEN the system displays Payment Success

Requirement: Payment action availability
The ShopFlow Checkout application SHALL expose a visible and enabled payment confirmation action when checkout payment is available.

Scenario: Payment action ready
- WHEN a user views checkout with payment available
- THEN a payment action is visible, enabled, and communicates payment or checkout intent

Requirement: Product bug state
The ShopFlow Checkout application SHALL provide a product bug scenario where the payment action required by checkout behavior is missing or unavailable.

Scenario: Payment action unavailable
- WHEN SpecHeal runs the Product Bug scenario
- THEN no visible and enabled payment action that satisfies checkout payment intent is available`;

export const SHOPFLOW_SCENARIOS: ShopFlowScenario[] = [
  {
    id: "healthy-flow",
    runtimeState: "normal",
    title: "Healthy Flow",
    label: "Baseline pass",
    summary:
      "The checkout payment action is available through the original test path.",
    oldSelector: "#pay-now",
    currentSelector: "#pay-now",
    expectedText: "Payment Success",
    testName: "shopflow checkout should complete payment",
    stepName: "Confirm payment from checkout",
    intentKeywords: ["pay", "payment", "checkout", "complete", "confirm"],
    patch: null
  },
  {
    id: "locator-drift",
    runtimeState: "drift",
    title: "Locator Drift",
    label: "Safe to heal",
    summary:
      "The old locator is gone, but the visible payment behavior still exists.",
    oldSelector: "#pay-now",
    currentSelector: "[data-testid=\"complete-payment\"]",
    expectedText: "Payment Success",
    testName: "shopflow checkout should complete payment",
    stepName: "Confirm payment from checkout",
    intentKeywords: ["pay", "payment", "checkout", "complete", "confirm"],
    patch: {
      file: "tests/shopflow-checkout.spec.ts",
      oldLine: "await page.click(\"#pay-now\");",
      newLine: "await page.getByTestId(\"complete-payment\").click();",
      explanation:
        "The replacement locator targets the same user-visible payment action and must be validated before rerun."
    }
  },
  {
    id: "product-bug",
    runtimeState: "bug",
    title: "Product Bug",
    label: "Do not heal",
    summary:
      "The payment action required by the checkout requirement is unavailable.",
    oldSelector: "#pay-now",
    currentSelector: null,
    expectedText: "Payment Success",
    testName: "shopflow checkout should complete payment",
    stepName: "Confirm payment from checkout",
    intentKeywords: ["pay", "payment", "checkout", "complete", "confirm"],
    patch: null
  }
];

export function getShopFlowScenario(
  value: string | null | undefined
): ShopFlowScenario {
  return (
    SHOPFLOW_SCENARIOS.find(
      (scenario) => scenario.id === value || scenario.runtimeState === value
    ) ?? SHOPFLOW_SCENARIOS[0]
  );
}
