import { getRuntimeReadiness } from "@/lib/env";
import { SHOPFLOW_SCENARIOS } from "@/demo/shopflow";
import { listRecentRecoveryRuns } from "@/lib/specheal/runs";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const readiness = getRuntimeReadiness();
  const recentRuns = await readRecentRuns();

  return (
    <Dashboard
      initialRuns={recentRuns}
      readiness={readiness}
      scenarios={SHOPFLOW_SCENARIOS}
    />
  );
}

async function readRecentRuns() {
  try {
    return await listRecentRecoveryRuns(6);
  } catch {
    return [];
  }
}
