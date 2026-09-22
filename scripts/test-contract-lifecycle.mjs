import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const REPORTER = "0x1111111111111111111111111111111111111111";

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
}

function source(url, type, index) {
  const canonicalUrl = url.replace(/[?#].*$/, "");
  return {
    source_index: index,
    source_type: type,
    host: new URL(canonicalUrl).host.toLowerCase(),
    canonical_url: canonicalUrl,
    url_hash: sha256(canonicalUrl),
  };
}

function renderedText(url) {
  const path = url.split("/").pop();
  const fixtures = {
    "subject-profile.md": "Subject: AI model policy change notice with rollout scope and safety impact.",
    "primary-evidence.md": "Primary evidence: the model API change may alter tool access, safety filters, and operational exposure.",
    "model-risk-archive.md": "Archive: preserves the model risk notice, mitigation note, and timestamped rollout context.",
    "context-note.md": "Context: validators should fetch sources and return a durable model risk verdict rather than a local keyword score.",
    "thin-context.md": "Context unavailable.",
  };
  return fixtures[path] ?? `Source page: ${url}`;
}

function snapshots(sources) {
  return sources.map((item) => {
    const text = renderedText(item.canonical_url);
    return {
      source_index: item.source_index,
      source_type: item.source_type,
      canonical_url: item.canonical_url,
      host: item.host,
      url_hash: item.url_hash,
      snapshot_hash: sha256(text),
      snapshot_chars: text.length,
      text,
    };
  });
}

function commitments(sources, sourceSnapshots) {
  return sources.map((item, index) => ({
    source_index: item.source_index,
    source_type: item.source_type,
    host: item.host,
    canonical_url: item.canonical_url,
    url_hash: item.url_hash,
    snapshot_hash: sourceSnapshots[index].snapshot_hash,
    snapshot_chars: sourceSnapshots[index].snapshot_chars,
  }));
}

class ModelRiskRadarModel {
  constructor() {
    this.signals = new Map();
    this.verdicts = new Map();
    this.signalCount = 0;
  }

  registerSignal(contextUrl = "https://github.com/klopp78/modelriskradar-genlayer/blob/main/examples/context-note.md") {
    const claim = "A newly announced AI model/API policy change should be treated as medium risk until independent evidence confirms its scope, rollout state, and mitigation details.";
    const sources = [
      source("https://raw.githubusercontent.com/klopp78/modelriskradar-genlayer/main/examples/subject-profile.md", "subject", 1),
      source("https://github.com/klopp78/modelriskradar-genlayer/blob/main/examples/primary-evidence.md", "primary_evidence", 2),
      source("https://raw.githubusercontent.com/klopp78/modelriskradar-genlayer/main/examples/model-risk-archive.md", "archive", 3),
      source(contextUrl, "context", 4),
    ];
    const sourceSnapshots = snapshots(sources);
    const snapshotCommitments = commitments(sources, sourceSnapshots);
    const subjectSnapshot = sourceSnapshots.find((item) => item.source_type === "subject");
    const baseline = {
      claim,
      reporter: REPORTER,
      subject_url: sources[0].canonical_url,
      subject_snapshot_hash: subjectSnapshot.snapshot_hash,
      snapshot_commitments: snapshotCommitments,
    };
    const baselineRecord = {
      reporter: REPORTER,
      subject_excerpt: subjectSnapshot.text.slice(0, 1800),
      snapshot_commitments: snapshotCommitments,
      source_bundle_hash: sha256(canonicalJson(sources)),
      baseline_hash: sha256(canonicalJson(baseline)),
    };
    const signalId = `mrs_${sha256(`${REPORTER}|${claim.toLowerCase()}|${baselineRecord.baseline_hash}`).slice(0, 20)}`;
    if (this.signals.has(signalId)) throw new Error("signal_already_registered");
    this.signalCount += 1;
    this.signals.set(signalId, {
      schema_version: "modelriskradar.signal.v1",
      signal_id: signalId,
      reporter: REPORTER,
      claim,
      subject_url: sources[0].canonical_url,
      source_manifest: sources,
      baseline: baselineRecord,
      verdict_ids: [],
      state: "registered",
    });
    return signalId;
  }

  assessSignal(signalId) {
    const record = this.signals.get(signalId);
    if (!record) throw new Error("signal_not_found");
    const sourceSnapshots = snapshots(record.source_manifest);
    const snapshotCommitments = commitments(record.source_manifest, sourceSnapshots);
    const evidenceBundleHash = sha256(canonicalJson(snapshotCommitments));
    const assessmentContextHash = sha256(canonicalJson({
      signal_id: signalId,
      claim: record.claim,
      baseline_hash: record.baseline.baseline_hash,
      baseline_commitments: record.baseline.snapshot_commitments,
      current_snapshot_commitments: snapshotCommitments,
    }));
    const hosts = new Set(record.source_manifest.map((item) => item.host));
    const evidenceDiverse = hosts.size >= 2;
    const provenanceVerified = sourceSnapshots.every((item) => item.snapshot_chars > 20);
    const decision = evidenceDiverse && provenanceVerified ? "trusted" : "needs_review";
    const verdictId = `mrv_${sha256(`${signalId}|${decision}|${evidenceBundleHash}`).slice(0, 20)}`;
    if (this.verdicts.has(verdictId)) throw new Error("risk_report_already_recorded");
    const verdict = {
      schema_version: "modelriskradar.verdict.v1",
      verdict_id: verdictId,
      signal_id: signalId,
      baseline_hash: record.baseline.baseline_hash,
      evidence_bundle_hash: evidenceBundleHash,
      assessment_context_hash: assessmentContextHash,
      snapshot_commitments: snapshotCommitments,
      consensus_result: {
        decision,
        confidence: decision === "trusted" ? 88 : 54,
        subject_match: true,
        evidence_diverse: evidenceDiverse,
        provenance_verified: provenanceVerified,
        risk_level: decision === "trusted" ? "low" : "medium",
      },
      state: "finalized",
    };
    record.state = "assessed";
    record.verdict_ids.push(verdictId);
    this.verdicts.set(verdictId, verdict);
    return verdictId;
  }
}

function expectError(fn, message) {
  assert.throws(fn, (error) => String(error.message).includes(message));
}

const model = new ModelRiskRadarModel();
const signalId = model.registerSignal();
const signalRecord = model.signals.get(signalId);
assert.equal(signalRecord.state, "registered");
assert.equal(signalRecord.baseline.snapshot_commitments.length, 4);
assert.equal(signalRecord.baseline.baseline_hash.length, 64);
expectError(() => model.registerSignal(), "signal_already_registered");

const verdictId = model.assessSignal(signalId);
const verdict = model.verdicts.get(verdictId);
assert.equal(verdict.state, "finalized");
assert.equal(verdict.consensus_result.decision, "trusted");
assert.equal(verdict.consensus_result.evidence_diverse, true);
assert.equal(verdict.evidence_bundle_hash.length, 64);
assert.equal(verdict.assessment_context_hash.length, 64);
assert.deepEqual(model.signals.get(signalId).verdict_ids, [verdictId]);
expectError(() => model.assessSignal(signalId), "risk_report_already_recorded");
expectError(() => model.assessSignal("mrs_missing"), "signal_not_found");

console.log("ModelRiskRadar lifecycle tests passed");
