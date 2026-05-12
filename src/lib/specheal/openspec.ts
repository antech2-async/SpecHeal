import { readFile } from "node:fs/promises";
import path from "node:path";

const clauseCache = new Map<string, string>();
const SHOPFLOW_OPENSPEC_PATH =
  "openspec/changes/build-specheal-recovery-cockpit/specs/shopflow-checkout/spec.md";
const ALLOWED_OPENSPEC_FILES = new Map([
  [
    SHOPFLOW_OPENSPEC_PATH,
    path.join(
      process.cwd(),
      "openspec",
      "changes",
      "build-specheal-recovery-cockpit",
      "specs",
      "shopflow-checkout",
      "spec.md"
    )
  ]
]);

export async function loadOpenSpecClause(relativePath: string) {
  const absolutePath = resolveOpenSpecPath(relativePath);
  const cached = clauseCache.get(absolutePath);

  if (cached) {
    return cached;
  }

  const clause = (await readFile(absolutePath, "utf8")).trim();
  clauseCache.set(absolutePath, clause);
  return clause;
}

function resolveOpenSpecPath(relativePath: string) {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const absolutePath = ALLOWED_OPENSPEC_FILES.get(normalizedPath);

  if (!absolutePath) {
    throw new Error(`Refusing to load unmanaged OpenSpec file: ${relativePath}`);
  }

  return absolutePath;
}
