import { NextRequest, NextResponse } from "next/server";
import { publishRunToJira } from "@/lib/specheal/jira";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { runId } = await context.params;

  try {
    const jiraResult = await publishRunToJira(runId, "retry");
    return NextResponse.json({ jiraResult });
  } catch (error) {
    return NextResponse.json(
      {
        error: "SpecHeal could not retry Jira publishing.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
