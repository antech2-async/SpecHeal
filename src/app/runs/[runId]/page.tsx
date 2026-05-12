import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecoveryRunWithArtifacts } from "@/lib/specheal/runs";
import { RunReportView } from "@/app/run-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RunPageProps = {
  params: Promise<{
    runId: string;
  }>;
};

export default async function RunPage({ params }: RunPageProps) {
  const { runId } = await params;
  const result = await getRecoveryRunWithArtifacts(runId);

  if (!result) {
    notFound();
  }

  return (
    <main className="cockpitShell">
      <div className="reportNav">
        <Link href="/">Back to cockpit</Link>
        <span>{result.run.id}</span>
      </div>
      <RunReportView artifacts={result.artifacts} mode="full" run={result.run} />
    </main>
  );
}
