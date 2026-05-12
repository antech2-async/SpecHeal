export type AiUsageInput = {
  promptTokens?: number;
  cachedPromptTokens?: number;
  completionTokens?: number;
};

export type AiCostBreakdown = {
  estimatedCostUsd: number;
  inputCostUsd: number;
  cachedInputCostUsd: number;
  outputCostUsd: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  rates: {
    inputPerMillion: number;
    cachedInputPerMillion: number;
    outputPerMillion: number;
  };
  pricingSource: string;
  note: string;
};

const PRICING_SOURCE =
  "OpenAI API pricing for gpt-4o-mini text tokens, checked 2026-05-12";

const MODEL_PRICING: Record<
  string,
  AiCostBreakdown["rates"]
> = {
  "gpt-4o-mini": {
    inputPerMillion: 0.15,
    cachedInputPerMillion: 0.075,
    outputPerMillion: 0.6
  },
  "gpt-4o-mini-2024-07-18": {
    inputPerMillion: 0.15,
    cachedInputPerMillion: 0.075,
    outputPerMillion: 0.6
  }
};

export function estimateAiCost(
  model: string,
  usage: AiUsageInput
): AiCostBreakdown | undefined {
  const pricing = MODEL_PRICING[model];

  if (!pricing || usage.promptTokens == null || usage.completionTokens == null) {
    return undefined;
  }

  const cachedInputTokens = usage.cachedPromptTokens ?? 0;
  const billableInputTokens = Math.max(usage.promptTokens - cachedInputTokens, 0);
  const outputTokens = usage.completionTokens;
  const inputCostUsd = costFor(billableInputTokens, pricing.inputPerMillion);
  const cachedInputCostUsd = costFor(cachedInputTokens, pricing.cachedInputPerMillion);
  const outputCostUsd = costFor(outputTokens, pricing.outputPerMillion);

  return {
    estimatedCostUsd: roundCost(inputCostUsd + cachedInputCostUsd + outputCostUsd),
    inputCostUsd,
    cachedInputCostUsd,
    outputCostUsd,
    inputTokens: billableInputTokens,
    cachedInputTokens,
    outputTokens,
    rates: pricing,
    pricingSource: PRICING_SOURCE,
    note: "Estimate only; actual billing can vary by account, batch mode, credits, taxes, and pricing changes."
  };
}

function costFor(tokens: number, perMillion: number) {
  return roundCost((tokens / 1_000_000) * perMillion);
}

function roundCost(value: number) {
  return Number(value.toFixed(6));
}
