import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function check(name, assertion, detail) {
  checks.push({ name, assertion, detail });
}

function assertIncludes(file, values) {
  return values.every((value) => file.includes(value));
}

const shopflowSpec = read(
  "openspec/changes/build-specheal-recovery-cockpit/specs/shopflow-checkout/spec.md"
);
const evidenceSource = read("src/lib/specheal/evidence.ts");
const jiraSource = read("src/lib/specheal/jira.ts");
const openAiSource = read("src/lib/specheal/openai-verdict.ts");
const openSpecLoaderSource = read("src/lib/specheal/openspec.ts");
const orchestratorSource = read("src/lib/specheal/orchestrator.ts");
const runsSource = read("src/lib/specheal/runs.ts");

check(
  "ShopFlow OpenSpec stays selector-agnostic",
  !/[#][a-z0-9_-]+|data-testid|getByTestId|Playwright|baseline selector/i.test(
    shopflowSpec
  ),
  "ShopFlow requirements must describe behavior without concrete selectors."
);

check(
  "Runtime loads ShopFlow OpenSpec from artifact",
  assertIncludes(openSpecLoaderSource, [
    "readFile",
    "process.cwd()",
    "openspec",
    "ALLOWED_OPENSPEC_FILES",
    "Refusing to load unmanaged OpenSpec file"
  ]) &&
    assertIncludes(runsSource, [
      "loadOpenSpecClause",
      "SHOPFLOW_PROJECT.targetOpenSpecPath",
      "openSpecClause"
    ]),
  "Recovery runs should use the checked-in OpenSpec artifact instead of a copied clause string."
);

check(
  "DOM cleaning and sensitive masking are present",
  assertIncludes(evidenceSource, [
    "head",
    "script",
    "style",
    "NodeFilter.SHOW_COMMENT",
    "[masked-email]",
    "[masked-card]",
    "rawDomLength",
    "cleanedDomLength"
  ]),
  "Evidence sent to AI must remove framework noise and mask sensitive data."
);

check(
  "Candidate extraction is body-scoped and reports zero-candidate state",
  assertIncludes(evidenceSource, [
    "document.body.querySelectorAll",
    "visible && candidate.enabled",
    "rankCandidates"
  ]) && orchestratorSource.includes("zeroCandidates"),
  "Recovery candidates must come from actionable body-level elements."
);

check(
  "Jira payload mapping uses ADF and terminal issue types",
  assertIncludes(jiraSource, [
    'type: "doc"',
    "version: 1",
    "PRODUCT BUG",
    "return \"Bug\"",
    "return \"Task\"",
    "specheal",
    "ai-recovery",
    "playwright"
  ]),
  "Jira issues must use Atlassian Document Format and configured issue types."
);

check(
  "OpenAI failures do not use deterministic verdict fallback",
  assertIncludes(openAiSource, [
    "OpenAIConfigurationError",
    "OpenAIVerdictError",
    "client.chat.completions.parse",
    "zodResponseFormat"
  ]) &&
    !openAiSource.includes("fallbackVerdict") &&
    !openAiSource.includes("deterministic"),
  "Failed AI calls must surface operational failure instead of a hardcoded verdict."
);

check(
  "NO_HEAL_NEEDED stays report-only for Jira",
  assertIncludes(jiraSource, [
    'run.verdict === "NO_HEAL_NEEDED"',
    "return null",
    'status: "not_required"'
  ]),
  "Healthy baseline runs should persist as audit reports without Jira issue creation."
);

const failed = checks.filter((item) => !item.assertion);

for (const item of checks) {
  const symbol = item.assertion ? "PASS" : "FAIL";
  console.log(`${symbol} ${item.name}`);
  if (!item.assertion) {
    console.log(`  ${item.detail}`);
  }
}

if (failed.length > 0) {
  process.exitCode = 1;
}
