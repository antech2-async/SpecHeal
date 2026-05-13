import { randomUUID } from "node:crypto";
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
  SHOPFLOW_PROJECT
} from "@/demo/shopflow";
import { getAppBaseUrl } from "@/lib/env";
import { loadOpenSpecClause } from "./openspec";
import { createInitialRunReport, serializeRun } from "./run-report";

const RECENT_RUN_LIMIT = 20;

type MemoryStore = {
  runs: Map<string, SpecHealRun>;
  evidence: Map<string, (typeof runEvidence.$inferSelect)[]>;
  aiTraces: Map<string, (typeof aiTraces.$inferSelect)[]>;
  validation: Map<string, (typeof validationResults.$inferSelect)[]>;
  patches: Map<string, (typeof patchPreviews.$inferSelect)[]>;
  reruns: Map<string, (typeof rerunResults.$inferSelect)[]>;
  jira: Map<string, (typeof jiraPublishResults.$inferSelect)[]>;
};

declare global {
  var __spechealMemoryStore: MemoryStore | undefined;
  var __spechealDbFallbackWarned: boolean | undefined;
}

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
  const openSpecClause = await loadOpenSpecClause(
    SHOPFLOW_PROJECT.targetOpenSpecPath
  );

  const values = {
    projectId: SHOPFLOW_PROJECT.id,
    scenarioId: scenario.id,
    scenarioState: scenario.runtimeState,
    status: "pending" as const,
    targetUrl,
    baselineSelector: scenario.oldSelector,
    testFilePath: scenario.patch?.file ?? "tests/shopflow-checkout.spec.ts",
    openSpecPath: SHOPFLOW_PROJECT.targetOpenSpecPath,
    openSpecClause,
    report: createInitialRunReport(
      scenario,
      targetUrl,
      SHOPFLOW_PROJECT.targetOpenSpecPath,
      openSpecClause
    )
  };

  try {
    const [run] = await getDb()
      .insert(spechealRuns)
      .values(values)
      .returning();

    return serializeRun(run);
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    warnAboutMemoryStore(error);

    const now = new Date();
    const run: SpecHealRun = {
      id: randomUUID(),
      projectId: SHOPFLOW_PROJECT.id,
      scenarioId: scenario.id,
      scenarioState: scenario.runtimeState,
      status: "pending",
      verdict: null,
      reason: null,
      confidence: null,
      failedStage: null,
      errorMessage: null,
      targetUrl,
      baselineSelector: scenario.oldSelector,
      candidateSelector: null,
      testFilePath: scenario.patch?.file ?? "tests/shopflow-checkout.spec.ts",
      openSpecPath: SHOPFLOW_PROJECT.targetOpenSpecPath,
      openSpecClause,
      report: values.report,
      createdAt: now,
      updatedAt: now
    };

    memoryStore().runs.set(run.id, run);

    return serializeRun(run);
  }
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
  try {
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
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    warnAboutMemoryStore(error);
    return getMemoryArtifacts(runId);
  }
}

export async function findRecoveryRun(runId: string): Promise<SpecHealRun | null> {
  try {
    const [run] = await getDb()
      .select()
      .from(spechealRuns)
      .where(eq(spechealRuns.id, runId))
      .limit(1);

    return run ?? memoryStore().runs.get(runId) ?? null;
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    warnAboutMemoryStore(error);
    return memoryStore().runs.get(runId) ?? null;
  }
}

export async function listRecentRecoveryRuns(limit = RECENT_RUN_LIMIT) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  try {
    const runs = await getDb()
      .select()
      .from(spechealRuns)
      .orderBy(desc(spechealRuns.createdAt))
      .limit(safeLimit);

    return runs.map(serializeRun);
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    warnAboutMemoryStore(error);

    return [...memoryStore().runs.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, safeLimit)
      .map(serializeRun);
  }
}

export async function updateRecoveryRun(
  runId: string,
  values: Partial<typeof spechealRuns.$inferInsert>
) {
  const updatedAt = new Date();

  try {
    const [run] = await getDb()
      .update(spechealRuns)
      .set({
        ...values,
        updatedAt
      })
      .where(eq(spechealRuns.id, runId))
      .returning();

    if (run) {
      return serializeRun(run);
    }
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    warnAboutMemoryStore(error);
  }

  const current = memoryStore().runs.get(runId);

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...values,
    updatedAt
  } as SpecHealRun;
  memoryStore().runs.set(runId, next);

  return serializeRun(next);
}

export async function createRunEvidence(
  values: typeof runEvidence.$inferInsert
) {
  try {
    const [evidence] = await getDb().insert(runEvidence).values(values).returning();
    return evidence;
  } catch (error) {
    return createMemoryArtifact(
      error,
      memoryStore().evidence,
      values,
      () =>
        ({
          id: randomUUID(),
          createdAt: new Date(),
          ...values
        }) as typeof runEvidence.$inferSelect
    );
  }
}

export async function createAiTrace(values: typeof aiTraces.$inferInsert) {
  try {
    const [trace] = await getDb().insert(aiTraces).values(values).returning();
    return trace;
  } catch (error) {
    return createMemoryArtifact(
      error,
      memoryStore().aiTraces,
      values,
      () =>
        ({
          id: randomUUID(),
          createdAt: new Date(),
          ...values
        }) as typeof aiTraces.$inferSelect
    );
  }
}

export async function createValidationResult(
  values: typeof validationResults.$inferInsert
) {
  try {
    const [result] = await getDb()
      .insert(validationResults)
      .values(values)
      .returning();
    return result;
  } catch (error) {
    return createMemoryArtifact(
      error,
      memoryStore().validation,
      values,
      () =>
        ({
          id: randomUUID(),
          createdAt: new Date(),
          ...values
        }) as typeof validationResults.$inferSelect
    );
  }
}

export async function createPatchPreview(
  values: typeof patchPreviews.$inferInsert
) {
  try {
    const [preview] = await getDb().insert(patchPreviews).values(values).returning();
    return preview;
  } catch (error) {
    return createMemoryArtifact(
      error,
      memoryStore().patches,
      values,
      () =>
        ({
          id: randomUUID(),
          createdAt: new Date(),
          applied: false,
          ...values
        }) as typeof patchPreviews.$inferSelect
    );
  }
}

export async function createRerunResult(
  values: typeof rerunResults.$inferInsert
) {
  try {
    const [result] = await getDb().insert(rerunResults).values(values).returning();
    return result;
  } catch (error) {
    return createMemoryArtifact(
      error,
      memoryStore().reruns,
      values,
      () =>
        ({
          id: randomUUID(),
          createdAt: new Date(),
          ...values
        }) as typeof rerunResults.$inferSelect
    );
  }
}

export async function getLatestJiraPublishResult(runId: string) {
  try {
    const [result] = await getDb()
      .select()
      .from(jiraPublishResults)
      .where(eq(jiraPublishResults.runId, runId))
      .orderBy(desc(jiraPublishResults.createdAt))
      .limit(1);

    return result ?? latestMemory(memoryStore().jira.get(runId));
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    warnAboutMemoryStore(error);
    return latestMemory(memoryStore().jira.get(runId));
  }
}

export async function createJiraPublishResult(
  values: typeof jiraPublishResults.$inferInsert
) {
  try {
    const [result] = await getDb()
      .insert(jiraPublishResults)
      .values(values)
      .returning();

    return result;
  } catch (error) {
    return createMemoryArtifact(
      error,
      memoryStore().jira,
      values,
      () =>
        ({
          id: randomUUID(),
          createdAt: new Date(),
          issueKey: null,
          issueUrl: null,
          issueId: null,
          errorCode: null,
          errorMessage: null,
          payloadSummary: null,
          payload: null,
          ...values
        }) as typeof jiraPublishResults.$inferSelect
    );
  }
}

function serializeArtifact<T extends { createdAt: Date }>(artifact: T) {
  return {
    ...artifact,
    createdAt: artifact.createdAt.toISOString()
  };
}

function getMemoryArtifacts(runId: string) {
  const store = memoryStore();
  const evidence = latestMemory(store.evidence.get(runId));
  const aiTrace = latestMemory(store.aiTraces.get(runId));
  const validation = latestMemory(store.validation.get(runId));
  const patch = latestMemory(store.patches.get(runId));
  const rerun = latestMemory(store.reruns.get(runId));
  const jiraResults = [...(store.jira.get(runId) ?? [])]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  return {
    evidence: evidence ? serializeArtifact(evidence) : null,
    aiTrace: aiTrace ? serializeArtifact(aiTrace) : null,
    validation: validation ? serializeArtifact(validation) : null,
    patch: patch ? serializeArtifact(patch) : null,
    rerun: rerun ? serializeArtifact(rerun) : null,
    jiraResults: jiraResults.map(serializeArtifact)
  };
}

function createMemoryArtifact<
  TValues extends { runId: string },
  TArtifact extends { createdAt: Date }
>(
  error: unknown,
  map: Map<string, TArtifact[]>,
  values: TValues,
  create: () => TArtifact
) {
  if (!isRecoverableDatabaseError(error)) {
    throw error;
  }

  warnAboutMemoryStore(error);

  const artifact = create();
  const current = map.get(values.runId) ?? [];
  map.set(values.runId, [...current, artifact]);

  return artifact;
}

function latestMemory<T extends { createdAt: Date }>(items: T[] | undefined) {
  return [...(items ?? [])].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0] ?? null;
}

function memoryStore() {
  globalThis.__spechealMemoryStore ??= {
    runs: new Map(),
    evidence: new Map(),
    aiTraces: new Map(),
    validation: new Map(),
    patches: new Map(),
    reruns: new Map(),
    jira: new Map()
  };

  return globalThis.__spechealMemoryStore;
}

function warnAboutMemoryStore(error: unknown) {
  if (globalThis.__spechealDbFallbackWarned) {
    return;
  }

  globalThis.__spechealDbFallbackWarned = true;
  console.warn(
    `[SpecHeal] PostgreSQL unavailable (${summarizeDatabaseError(
      error
    )}); using in-memory demo runs for this dev session.`
  );
}

function isRecoverableDatabaseError(error: unknown) {
  return /DATABASE_URL|Invalid input|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|42P01|3D000|28P01|database .* does not exist|role .* does not exist/i.test(
    collectErrorText(error)
  );
}

function collectErrorText(error: unknown) {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  const queue: unknown[] = [error];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || seen.has(current)) {
      continue;
    }

    seen.add(current);

    if (typeof current === "string") {
      parts.push(current);
      continue;
    }

    if (current instanceof Error) {
      parts.push(current.message);
      const withCause = current as Error & { cause?: unknown };

      if (withCause.cause) {
        queue.push(withCause.cause);
      }
    }

    if (current instanceof AggregateError) {
      queue.push(...current.errors);
    }

    if (typeof current === "object") {
      const record = current as Record<string, unknown>;

      for (const key of ["code", "errno", "detail", "message"]) {
        if (typeof record[key] === "string") {
          parts.push(record[key]);
        }
      }
    }
  }

  return parts.join(" ");
}

function summarizeDatabaseError(error: unknown) {
  const text = collectErrorText(error);
  const match = text.match(
    /DATABASE_URL|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|42P01|3D000|28P01/i
  );

  return match?.[0] ?? "connection failed";
}
