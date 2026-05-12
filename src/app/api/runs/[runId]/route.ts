import { NextRequest, NextResponse } from "next/server";
import { getRecoveryRunWithArtifacts } from "@/lib/specheal/runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { runId } = await context.params;
  const result = await getRecoveryRunWithArtifacts(runId);

  if (!result) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
