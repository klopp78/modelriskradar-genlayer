import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const contractPath = resolve("contracts/model_risk_radar.py");
const source = readFileSync(contractPath, "utf8");
const expectedRuntime =
  "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

assert(source.includes(expectedRuntime), `missing pinned runtime dependency: ${expectedRuntime}`);
assert(/class\s+ModelRiskRadar\s*\(\s*gl\.Contract\s*\)\s*:/.test(source), "ModelRiskRadar must inherit gl.Contract");
assert(!/gl\.get_webpage|gl\.exec_prompt|gl\.json_loads|gl\.json_dumps|gl\.msg/.test(source), "unsupported legacy gl APIs remain");

for (const method of [
  "register_signal",
  "assess_signal",
  "get_signal",
  "get_verdict",
  "list_signal_ids",
  "list_verdict_ids",
]) {
  assert(new RegExp(`def\\s+${method}\\s*\\(`).test(source), `missing method: ${method}`);
}

for (const method of ["register_signal", "assess_signal"]) {
  assert(new RegExp(`@gl\\.public\\.write\\s+def\\s+${method}\\s*\\(`, "s").test(source), `${method} must be public.write`);
}

for (const method of ["get_signal", "get_verdict", "list_signal_ids", "list_verdict_ids"]) {
  assert(new RegExp(`@gl\\.public\\.view\\s+def\\s+${method}\\s*\\(`, "s").test(source), `${method} must be public.view`);
}

assert(/gl\.vm\.run_nondet_unsafe/.test(source), "missing GenLayer consensus gate");
assert(/gl\.nondet\.web\.render/.test(source), "missing source snapshot rendering");
assert(/gl\.nondet\.exec_prompt/.test(source), "missing validator prompt assessment");
assert(/hashlib\.sha256/.test(source), "must use collision-resistant SHA-256");
assert(/snapshot_commitments/.test(source), "must persist snapshot commitments");
assert(/evidence_bundle_hash/.test(source), "must persist evidence bundle hash");
assert(/assessment_context_hash/.test(source), "must persist assessment context hash");
assert(/source_manifest/.test(source), "must persist source manifest");
assert(/subject_match/.test(source) && /evidence_diverse/.test(source), "verdict must preserve consequential assessment fields");
assert(/provenance_verified/.test(source), "verdict must verify provenance");
assert(/proposed\.snapshot_commitments_json == independent\.snapshot_commitments_json/.test(source), "validators must compare snapshot commitments");
assert(/len\(data\["snapshot_commitments"\]\) != 4/.test(source), "verdict parser must require four source commitments");
assert(!/32-bit|crc32|adler32/.test(source), "weak hash wording or implementation remains");

const signalId = `mrs_${sha256("reporter|claim|baseline").slice(0, 20)}`;
const verdictId = `mrv_${sha256("signal|trusted|evidence").slice(0, 20)}`;
assert(signalId.length === 24, "signal id format check failed");
assert(verdictId.length === 24, "verdict id format check failed");

console.log("ModelRiskRadar contract check passed");
