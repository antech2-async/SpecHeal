import { NextRequest, NextResponse } from "next/server";
import { getRecoveryRun } from "@/lib/specheal/runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { runId } = await context.params;
  const run = await getRecoveryRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({ run });
}
