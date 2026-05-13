import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { SpecHealRun } from "@/db/schema";
import type { ShopFlowScenario } from "@/demo/shopflow";
import { readOpenAIEnv } from "@/lib/env";
import { estimateAiCost } from "./ai-cost";
import type { FailureEvidence } from "./evidence";
import { createAiTrace } from "./runs";

const recoveryVerdictSchema = z.object({
  verdict: z.enum(["HEAL", "PRODUCT BUG", "SPEC OUTDATED"]),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
  candidateSelector: z.string().nullable(),
  patch: z
    .object({
      file: z.string(),
      oldLine: z.string(),
      newLine: z.string(),
      explanation: z.string()
    })
    .nullable(),
  jiraReport: z
    .object({
      title: z.string(),
      summary: z.string(),
      recommendedAction: z.string(),
      evidence: z.array(z.string())
    })
    .nullable()
});

export type RecoveryVerdict = z.infer<typeof recoveryVerdictSchema>;

export class OpenAIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIConfigurationError";
  }
}

export class OpenAIVerdictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIVerdictError";
  }
}

type GenerateVerdictOptions = {
  run: SpecHealRun;
  scenario: ShopFlowScenario;
  evidence: FailureEvidence;
};

type PromptBundle = {
  systemPrompt: string;
  userPrompt: string;
};

export async function generateOpenAIVerdict({
  run,
  scenario,
  evidence
}: GenerateVerdictOptions) {
  const prompt = buildVerdictPrompt({ run, scenario, evidence });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const startedAt = performance.now();

  let env: ReturnType<typeof readOpenAIEnv>;

  try {
    env = readOpenAIEnv();
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "OpenAI is not configured. Set OPENAI_API_KEY before running recovery scenarios that need an AI verdict."
        : error instanceof Error
        ? error.message
        : "OpenAI environment is not configured.";

    await createAiTrace({
      runId: run.id,
      model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      errorCode: "OPENAI_NOT_CONFIGURED",
      errorMessage: message,
      durationMs: elapsedMs(startedAt)
    });

    throw new OpenAIConfigurationError(message);
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.parse({
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt }
      ],
      response_format: zodResponseFormat(
        recoveryVerdictSchema,
        "specheal_recovery_verdict"
      )
    });

    const message = completion.choices[0]?.message;
    const parsed = message?.parsed;
    const rawResponse =
      message?.content ?? JSON.stringify(message?.parsed ?? message ?? {});
    const usage = completion.usage;
    const cachedPromptTokens =
      usage?.prompt_tokens_details?.cached_tokens ?? undefined;
    const costBreakdown = estimateAiCost(env.OPENAI_MODEL, {
      promptTokens: usage?.prompt_tokens,
      cachedPromptTokens,
      completionTokens: usage?.completion_tokens
    });
    const estimatedCostUsd = costBreakdown?.estimatedCostUsd;

    if (!parsed) {
      await createAiTrace({
        runId: run.id,
        model: env.OPENAI_MODEL,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        rawResponse,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        estimatedCostUsd,
        durationMs: elapsedMs(startedAt),
        errorCode: "OPENAI_PARSE_FAILED",
        errorMessage: "OpenAI returned a response without parsed verdict data."
      });

      throw new OpenAIVerdictError(
        "OpenAI returned a response without parsed verdict data."
      );
    }

    await createAiTrace({
      runId: run.id,
      model: env.OPENAI_MODEL,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      rawResponse,
      parsedResponse: parsed,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      estimatedCostUsd,
      durationMs: elapsedMs(startedAt)
    });

    return {
      verdict: parsed,
      usage: {
        promptTokens: usage?.prompt_tokens,
        cachedPromptTokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        estimatedCostUsd,
        costBreakdown
      },
      model: env.OPENAI_MODEL,
      rawResponse
    };
  } catch (error) {
    if (error instanceof OpenAIVerdictError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Unknown OpenAI verdict failure.";

    await createAiTrace({
      runId: run.id,
      model: env.OPENAI_MODEL,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      errorCode: "OPENAI_CALL_FAILED",
      errorMessage: message,
      durationMs: elapsedMs(startedAt)
    });

    throw new OpenAIVerdictError(message);
  }
}

function buildVerdictPrompt({
  run,
  scenario,
  evidence
}: GenerateVerdictOptions): PromptBundle {
  const systemPrompt = [
    "You are SpecHeal, a recovery verdict engine for Playwright UI test failures.",
    "Use OpenSpec as the source of truth for product behavior.",
    "Classify only failed runs. Successful baseline runs never reach you.",
    "Return HEAL only when the old selector drifted but the required user-visible behavior is still satisfied by a valid candidate.",
    "Return PRODUCT BUG when the OpenSpec-required payment behavior is missing or unavailable.",
    "Return SPEC OUTDATED when the test or spec no longer describes the intended behavior and selector replacement is insufficient.",
    "Never claim product code was fixed. Never invent a selector that is not present in the candidates."
  ].join("\n");

  const userPayload = {
    run: {
      id: run.id,
      projectId: run.projectId,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      scenarioState: scenario.runtimeState
    },
    testMetadata: {
      testName: scenario.testName,
      stepName: scenario.stepName,
      failedSelector: evidence.failedSelector,
      expectedText: scenario.expectedText,
      targetUrl: evidence.targetUrl
    },
    openSpecClause: run.openSpecClause,
    failureEvidence: {
      playwrightError: evidence.playwrightError,
      visibleText: evidence.visibleText,
      visibleEvidence: evidence.visibleEvidence,
      rawDomLength: evidence.rawDomLength,
      cleanedDomLength: evidence.cleanedDomLength,
      domNoiseSummary: evidence.domNoiseSummary,
      cleanedDomExcerpt: evidence.cleanedDom.slice(0, 8000)
    },
    candidates: evidence.candidates.slice(0, 10).map((candidate) => ({
      selector: candidate.selector,
      selectorKind: candidate.selectorKind,
      tagName: candidate.tagName,
      text: candidate.text,
      visibleText: candidate.visibleText,
      ariaLabel: candidate.ariaLabel,
      testId: candidate.testId,
      dataTest: candidate.dataTest,
      dataCy: candidate.dataCy,
      id: candidate.id,
      name: candidate.name,
      role: candidate.role,
      type: candidate.type,
      placeholder: candidate.placeholder,
      nearestLabel: candidate.nearestLabel,
      parentContext: candidate.parentContext,
      rowContext: candidate.rowContext,
      containerContext: candidate.containerContext,
      suggestedLocators: candidate.suggestedLocators,
      rank: candidate.rank,
      rankReason: candidate.rankReason,
      rankSignals: candidate.rankSignals
    })),
    requiredOutputRules: {
      candidateSelector:
        "For HEAL, set to one exact selector from a candidate selector or suggestedLocators entry. Otherwise null.",
      patch:
        "For HEAL, propose only a Playwright test locator patch. For other verdicts, null.",
      jiraReport:
        "Provide a concise Jira-ready title, summary, recommended action, and evidence list."
    }
  };

  return {
    systemPrompt,
    userPrompt: JSON.stringify(userPayload, null, 2)
  };
}

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}
