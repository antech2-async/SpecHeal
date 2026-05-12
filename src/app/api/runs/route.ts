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

export async function POST(request: NextRequest) {
  try {
    const body = createRunSchema.parse(await request.json());
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

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Request body must include a valid scenarioId." },
        { status: 400 }
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

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const runs = await listRecentRecoveryRuns(
    Number.isFinite(limit) ? Number(limit) : undefined
  );

  return NextResponse.json({ runs });
}
