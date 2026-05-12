import { findShopFlowScenario } from "@/demo/shopflow";
import { executeCheckoutAttempt } from "./evidence";
import { generateOpenAIVerdict } from "./openai-verdict";
import {
  applySafeLocatorPatch,
  buildOperationalErrorOutput,
  buildProductBugOutput,
  buildSafeHealOutput,
  buildSpecOutdatedOutput,
  runPatchedCheckoutProof,
  validateHealCandidate
} from "./proof";
import { appendTimelineEvent, normalizeRunReport } from "./run-report";
import {
  createPatchPreview,
  createRerunResult,
  createRunEvidence,
  createValidationResult,
  findRecoveryRun,
  updateRecoveryRun
} from "./runs";

const activeRuns = new Set<string>();

export function startRunOrchestration(runId: string) {
  if (activeRuns.has(runId)) {
    return;
  }

  activeRuns.add(runId);

  setTimeout(() => {
    void orchestrateRecoveryRun(runId).finally(() => {
      activeRuns.delete(runId);
    });
  }, 0);
}

async function orchestrateRecoveryRun(runId: string) {
  const run = await findRecoveryRun(runId);

  if (!run) {
    return;
  }

  const scenario = findShopFlowScenario(run.scenarioId);

  if (!scenario) {
    await updateRecoveryRun(runId, {
      status: "failed",
      verdict: "RUN_ERROR",
      failedStage: "scenario_lookup",
      errorMessage: `Unknown scenario for persisted run: ${run.scenarioId}`,
      report: appendTimelineEvent(
        {
          ...normalizeRunReport(run.report),
          output: buildOperationalErrorOutput({
            stage: "scenario_lookup",
            message: `Unknown scenario for persisted run: ${run.scenarioId}`
          })
        },
        {
          key: "scenario-lookup-failed",
          title: "Scenario lookup failed",
          status: "failed",
          detail: `SpecHeal could not find scenario ${run.scenarioId}.`,
          timestamp: new Date().toISOString()
        }
      )
    });
    return;
  }

  const runningReport = appendTimelineEvent(run.report, {
    key: "orchestration-started",
    title: "Recovery orchestration started",
    status: "running",
    detail: `Runner selected ${scenario.title} and prepared ShopFlow state ${scenario.runtimeState}.`,
    timestamp: new Date().toISOString()
  });

  await updateRecoveryRun(runId, {
    status: "running",
    report: runningReport
  });

  try {
    const attempt = await executeCheckoutAttempt({
      scenario,
      targetUrl: run.targetUrl ?? runningReport.target.url
    });

    const reportWithAttempt = {
      ...normalizeRunReport(runningReport),
      playwright: {
        passed: attempt.passed,
        selectorUsed: attempt.selectorUsed,
        targetUrl: attempt.targetUrl,
        testName: scenario.testName,
        stepName: scenario.stepName,
        durationMs: attempt.durationMs,
        errorMessage: attempt.passed
          ? undefined
          : attempt.evidence.playwrightError
      }
    };

    if (attempt.passed) {
      await updateRecoveryRun(runId, {
        status: "completed",
        verdict: "NO_HEAL_NEEDED",
        reason:
          "Baseline Playwright checkout reached Payment Success without recovery.",
        confidence: 1,
        report: appendTimelineEvent(reportWithAttempt, {
          key: "baseline-passed",
          title: "Baseline Playwright passed",
          status: "completed",
          detail:
            "The original checkout selector reached Payment Success, so AI recovery is skipped.",
          timestamp: new Date().toISOString()
        })
      });
      return;
    }

    await createRunEvidence({
      runId,
      playwrightError: attempt.evidence.playwrightError,
      screenshotBase64: attempt.evidence.screenshotBase64,
      failedSelector: attempt.evidence.failedSelector,
      targetUrl: attempt.evidence.targetUrl,
      rawDomLength: attempt.evidence.rawDomLength,
      cleanedDomLength: attempt.evidence.cleanedDomLength,
      cleanedDom: attempt.evidence.cleanedDom,
      visibleEvidence: {
        text: attempt.evidence.visibleText,
        zeroCandidates: attempt.evidence.candidates.length === 0
      },
      candidates: attempt.evidence.candidates.map((candidate) => ({
        ...candidate
      }))
    });

    const reportWithEvidence = appendTimelineEvent(
      {
        ...reportWithAttempt,
        evidence: {
          failedSelector: attempt.evidence.failedSelector,
          targetUrl: attempt.evidence.targetUrl,
          screenshotBase64: attempt.evidence.screenshotBase64,
          rawDomLength: attempt.evidence.rawDomLength,
          cleanedDomLength: attempt.evidence.cleanedDomLength,
          visibleText: attempt.evidence.visibleText,
          candidateCount: attempt.evidence.candidates.length,
          candidates: attempt.evidence.candidates.map((candidate) => ({
            ...candidate
          }))
        }
      },
      {
        key: "failure-evidence-captured",
        title:
          attempt.evidence.candidates.length > 0
            ? "Failure evidence captured"
            : "Failure evidence captured with zero candidates",
        status: "completed",
        detail: `Captured screenshot, cleaned DOM, visible text, and ${attempt.evidence.candidates.length} candidate element(s).`,
        timestamp: new Date().toISOString()
      }
    );

    try {
      const aiResult = await generateOpenAIVerdict({
        run,
        scenario,
        evidence: attempt.evidence
      });
      const aiReport = {
        ...reportWithEvidence,
        ai: {
          status: "completed" as const,
          model: aiResult.model,
          verdict: aiResult.verdict.verdict,
          reason: aiResult.verdict.reason,
          confidence: aiResult.verdict.confidence,
          candidateSelector: aiResult.verdict.candidateSelector,
          promptTokens: aiResult.usage.promptTokens,
          completionTokens: aiResult.usage.completionTokens,
          totalTokens: aiResult.usage.totalTokens,
          estimatedCostUsd: aiResult.usage.estimatedCostUsd
        }
      };

      if (aiResult.verdict.verdict === "HEAL") {
        const validation = await validateHealCandidate({
          scenario,
          targetUrl: attempt.evidence.targetUrl,
          selector: aiResult.verdict.candidateSelector
        });

        await createValidationResult({
          runId,
          selector: validation.selector || "(missing)",
          passed: validation.passed,
          elementCount: validation.elementCount,
          reason: validation.reason
        });

        const validationReport = appendTimelineEvent(
          {
            ...aiReport,
            validation
          },
          {
            key: validation.passed
              ? "candidate-validation-passed"
              : "candidate-validation-failed",
            title: validation.passed
              ? "Candidate validation passed"
              : "Candidate validation failed",
            status: validation.passed ? "completed" : "failed",
            detail: validation.reason,
            timestamp: new Date().toISOString()
          }
        );

        if (!validation.passed || !aiResult.verdict.candidateSelector) {
          await updateRecoveryRun(runId, {
            status: "failed",
            verdict: "HEAL",
            reason:
              "OpenAI classified this as HEAL, but browser candidate validation did not pass.",
            confidence: aiResult.verdict.confidence,
            candidateSelector: aiResult.verdict.candidateSelector,
            failedStage: "candidate_validation",
            errorMessage: validation.reason,
            report: validationReport
          });
          return;
        }

        const patch = await applySafeLocatorPatch({
          scenario,
          selector: aiResult.verdict.candidateSelector,
          verdict: aiResult.verdict
        });
        const rerun = await runPatchedCheckoutProof({
          scenario,
          selector: aiResult.verdict.candidateSelector
        });

        await createRerunResult({
          runId,
          testFilePath: rerun.testFilePath,
          selector: rerun.selector,
          passed: rerun.passed,
          expectedText: rerun.expectedText,
          durationMs: rerun.durationMs,
          errorMessage: rerun.errorMessage
        });

        const rerunReport = appendTimelineEvent(
          {
            ...validationReport,
            rerun
          },
          {
            key: rerun.passed ? "rerun-proof-passed" : "rerun-proof-failed",
            title: rerun.passed ? "Patched rerun passed" : "Patched rerun failed",
            status: rerun.passed ? "completed" : "failed",
            detail: rerun.passed
              ? "The patched Playwright test reached Payment Success."
              : rerun.errorMessage || "The patched Playwright test did not pass.",
            timestamp: new Date().toISOString()
          }
        );

        if (!rerun.passed) {
          await updateRecoveryRun(runId, {
            status: "failed",
            verdict: "HEAL",
            reason:
              "OpenAI classified this as HEAL and validation passed, but patched rerun proof failed.",
            confidence: aiResult.verdict.confidence,
            candidateSelector: aiResult.verdict.candidateSelector,
            failedStage: "rerun_proof",
            errorMessage: rerun.errorMessage,
            report: rerunReport
          });
          return;
        }

        await createPatchPreview({
          runId,
          filePath: patch.filePath,
          oldLine: patch.oldLine,
          newLine: patch.newLine,
          appliedDiff: patch.appliedDiff,
          explanation: patch.explanation,
          applied: patch.applied
        });

        await updateRecoveryRun(runId, {
          status: "completed",
          verdict: "HEAL",
          reason: aiResult.verdict.reason,
          confidence: aiResult.verdict.confidence,
          candidateSelector: aiResult.verdict.candidateSelector,
          failedStage: null,
          errorMessage: null,
          report: appendTimelineEvent(
            {
              ...rerunReport,
              patch,
              output: buildSafeHealOutput({
                scenario,
                validation,
                patch,
                rerun
              })
            },
            {
              key: "safe-patch-ready",
              title: "Safe patch ready for review",
              status: "completed",
              detail:
                "Validation, controlled test-file patch application, and rerun proof all passed.",
              timestamp: new Date().toISOString()
            }
          )
        });
        return;
      }

      const output =
        aiResult.verdict.verdict === "PRODUCT BUG"
          ? buildProductBugOutput({
              scenario,
              verdict: aiResult.verdict,
              visibleText: attempt.evidence.visibleText
            })
          : buildSpecOutdatedOutput({
              scenario,
              verdict: aiResult.verdict
            });

      await updateRecoveryRun(runId, {
        status: "completed",
        verdict: aiResult.verdict.verdict,
        reason: aiResult.verdict.reason,
        confidence: aiResult.verdict.confidence,
        candidateSelector: aiResult.verdict.candidateSelector,
        report: appendTimelineEvent(
          {
            ...aiReport,
            output
          },
          {
            key: `ai-verdict-${aiResult.verdict.verdict.toLowerCase().replace(/\s+/g, "-")}`,
            title: `OpenAI verdict: ${aiResult.verdict.verdict}`,
            status: "completed",
            detail: aiResult.verdict.reason,
            timestamp: new Date().toISOString()
          }
        )
      });
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown OpenAI verdict failure.";

      await updateRecoveryRun(runId, {
        status: "failed",
        verdict: "RUN_ERROR",
        reason:
          "SpecHeal captured Playwright failure evidence but could not produce a trusted live OpenAI verdict.",
        failedStage: "openai_verdict",
        errorMessage: message,
        report: appendTimelineEvent(
          {
            ...reportWithEvidence,
            ai: {
              status: "failed" as const,
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
              errorMessage: message
            },
            output: buildOperationalErrorOutput({
              stage: "openai_verdict",
              message,
              scenarioTitle: scenario.title
            })
          },
          {
            key: "openai-verdict-failed",
            title: "OpenAI verdict failed",
            status: "failed",
            detail: message,
            timestamp: new Date().toISOString()
          }
        )
      });
      return;
    }
  } catch (error) {
    await updateRecoveryRun(runId, {
      status: "failed",
      verdict: "RUN_ERROR",
      failedStage: "playwright_execution",
      errorMessage:
        error instanceof Error ? error.message : "Unknown Playwright runtime error",
      report: appendTimelineEvent(
        {
          ...runningReport,
          output: buildOperationalErrorOutput({
            stage: "playwright_execution",
            message:
              error instanceof Error
                ? error.message
                : "Unknown Playwright runtime error",
            scenarioTitle: scenario.title
          })
        },
        {
          key: "playwright-runtime-error",
          title: "Playwright runtime failed",
          status: "failed",
          detail:
            error instanceof Error ? error.message : "Unknown Playwright runtime error",
          timestamp: new Date().toISOString()
        }
      )
    });
  }
}
