import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  aiTraces,
  jiraPublishResults,
  patchPreviews,
  runEvidence,
  rerunResults,
  spechealRuns,
  validationResults,
  type SpecHealRun
} from "@/db/schema";
import {
  findShopFlowScenario,
  SHOPFLOW_OPENSPEC_CLAUSE,
  SHOPFLOW_PROJECT
} from "@/demo/shopflow";
import { getAppBaseUrl } from "@/lib/env";
import { createInitialRunReport, serializeRun } from "./run-report";

const RECENT_RUN_LIMIT = 20;

export class UnknownScenarioError extends Error {
  constructor(scenarioId: string) {
    super(`Unknown ShopFlow scenario: ${scenarioId}`);
    this.name = "UnknownScenarioError";
  }
}

export async function createRecoveryRun(scenarioId: string) {
  const scenario = findShopFlowScenario(scenarioId);

  if (!scenario) {
    throw new UnknownScenarioError(scenarioId);
  }

  const targetUrl = new URL(
    `${SHOPFLOW_PROJECT.targetPath}?state=${scenario.runtimeState}`,
    getAppBaseUrl()
  ).toString();

  const [run] = await getDb()
    .insert(spechealRuns)
    .values({
      projectId: SHOPFLOW_PROJECT.id,
      scenarioId: scenario.id,
      scenarioState: scenario.runtimeState,
      status: "pending",
      targetUrl,
      baselineSelector: scenario.oldSelector,
      testFilePath: scenario.patch?.file ?? "tests/shopflow-checkout.spec.ts",
      openSpecPath: SHOPFLOW_PROJECT.targetOpenSpecPath,
      openSpecClause: SHOPFLOW_OPENSPEC_CLAUSE,
      report: createInitialRunReport(
        scenario,
        targetUrl,
        SHOPFLOW_PROJECT.targetOpenSpecPath,
        SHOPFLOW_OPENSPEC_CLAUSE
      )
    })
    .returning();

  return serializeRun(run);
}

export async function getRecoveryRun(runId: string) {
  const run = await findRecoveryRun(runId);
  return run ? serializeRun(run) : null;
}

export async function getRecoveryRunWithArtifacts(runId: string) {
  const run = await getRecoveryRun(runId);

  if (!run) {
    return null;
  }

  return {
    run,
    artifacts: await getRecoveryRunArtifacts(runId)
  };
}

export async function getRecoveryRunArtifacts(runId: string) {
  const db = getDb();
  const [evidence] = await db
    .select()
    .from(runEvidence)
    .where(eq(runEvidence.runId, runId))
    .orderBy(desc(runEvidence.createdAt))
    .limit(1);
  const [aiTrace] = await db
    .select()
    .from(aiTraces)
    .where(eq(aiTraces.runId, runId))
    .orderBy(desc(aiTraces.createdAt))
    .limit(1);
  const [validation] = await db
    .select()
    .from(validationResults)
    .where(eq(validationResults.runId, runId))
    .orderBy(desc(validationResults.createdAt))
    .limit(1);
  const [patch] = await db
    .select()
    .from(patchPreviews)
    .where(eq(patchPreviews.runId, runId))
    .orderBy(desc(patchPreviews.createdAt))
    .limit(1);
  const [rerun] = await db
    .select()
    .from(rerunResults)
    .where(eq(rerunResults.runId, runId))
    .orderBy(desc(rerunResults.createdAt))
    .limit(1);
  const jiraResults = await db
    .select()
    .from(jiraPublishResults)
    .where(eq(jiraPublishResults.runId, runId))
    .orderBy(desc(jiraPublishResults.createdAt))
    .limit(5);

  return {
    evidence: evidence ? serializeArtifact(evidence) : null,
    aiTrace: aiTrace ? serializeArtifact(aiTrace) : null,
    validation: validation ? serializeArtifact(validation) : null,
    patch: patch ? serializeArtifact(patch) : null,
    rerun: rerun ? serializeArtifact(rerun) : null,
    jiraResults: jiraResults.map(serializeArtifact)
  };
}

export async function findRecoveryRun(runId: string): Promise<SpecHealRun | null> {
  const [run] = await getDb()
    .select()
    .from(spechealRuns)
    .where(eq(spechealRuns.id, runId))
    .limit(1);

  return run ?? null;
}

export async function listRecentRecoveryRuns(limit = RECENT_RUN_LIMIT) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const runs = await getDb()
    .select()
    .from(spechealRuns)
    .orderBy(desc(spechealRuns.createdAt))
    .limit(safeLimit);

  return runs.map(serializeRun);
}

export async function updateRecoveryRun(
  runId: string,
  values: Partial<typeof spechealRuns.$inferInsert>
) {
  const [run] = await getDb()
    .update(spechealRuns)
    .set({
      ...values,
      updatedAt: new Date()
    })
    .where(eq(spechealRuns.id, runId))
    .returning();

  return run ? serializeRun(run) : null;
}

export async function createRunEvidence(
  values: typeof runEvidence.$inferInsert
) {
  const [evidence] = await getDb().insert(runEvidence).values(values).returning();
  return evidence;
}

export async function createAiTrace(values: typeof aiTraces.$inferInsert) {
  const [trace] = await getDb().insert(aiTraces).values(values).returning();
  return trace;
}

export async function createValidationResult(
  values: typeof validationResults.$inferInsert
) {
  const [result] = await getDb()
    .insert(validationResults)
    .values(values)
    .returning();
  return result;
}

export async function createPatchPreview(
  values: typeof patchPreviews.$inferInsert
) {
  const [preview] = await getDb().insert(patchPreviews).values(values).returning();
  return preview;
}

export async function createRerunResult(
  values: typeof rerunResults.$inferInsert
) {
  const [result] = await getDb().insert(rerunResults).values(values).returning();
  return result;
}

function serializeArtifact<T extends { createdAt: Date }>(artifact: T) {
  return {
    ...artifact,
    createdAt: artifact.createdAt.toISOString()
  };
}
