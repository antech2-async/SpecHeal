import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  runEvidence,
  spechealRuns,
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
