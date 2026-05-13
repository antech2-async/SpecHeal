import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startRunOrchestration } from "@/lib/specheal/orchestrator";
import {
  createRecoveryRun,
  listRecentRecoveryRuns,
  UnknownScenarioError
} from "@/lib/specheal/runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createRunSchema = z.object({
  scenarioId: z.string().trim().min(1)
});

async function parseCreateRunRequest(request: NextRequest) {
  const rawBody = await request.text();
  const scenarioFromQuery = request.nextUrl.searchParams.get("scenarioId");

  if (!rawBody.trim()) {
    return createRunSchema.parse({ scenarioId: scenarioFromQuery });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = Object.fromEntries(new URLSearchParams(rawBody));
  }

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = { scenarioId: payload };
    }
  }

  return createRunSchema.parse({
    ...(payload && typeof payload === "object" ? payload : {}),
    scenarioId:
      payload && typeof payload === "object" && "scenarioId" in payload
        ? (payload as { scenarioId?: unknown }).scenarioId
        : scenarioFromQuery
  });
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof createRunSchema>;

  try {
    body = await parseCreateRunRequest(request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Request body must include a valid scenarioId." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "SpecHeal could not read the recovery request.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }

  try {
    const run = await createRecoveryRun(body.scenarioId);

    startRunOrchestration(run.id);

    return NextResponse.json(
      {
        run,
        pollUrl: `/api/runs/${run.id}`
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof UnknownScenarioError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof z.ZodError || isRuntimeConfigurationError(error)) {
      return NextResponse.json(
        {
          error: "SpecHeal runtime is not fully configured.",
          detail:
            error instanceof Error
              ? error.message
              : "Check DATABASE_URL, OPENAI_API_KEY, and Jira settings."
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "SpecHeal could not create a recovery run.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

function isRuntimeConfigurationError(error: unknown) {
  return (
    error instanceof Error &&
    /DATABASE_URL|OPENAI_API_KEY|JIRA_|environment|configured/i.test(
      error.message
    )
  );
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const runs = await listRecentRecoveryRuns(
    Number.isFinite(limit) ? Number(limit) : undefined
  );

  return NextResponse.json({ runs });
}
