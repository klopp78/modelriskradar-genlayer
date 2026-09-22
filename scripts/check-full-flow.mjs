import assert from "node:assert/strict";

const walletAddress = "0x1111111111111111111111111111111111111111";
const signalId = "mrs_9cfe7c9b23f8428f2d3a";
const verdictId = "mrv_725bf671258bf0427c5e";

class StudioFlowSimulator {
  constructor() {
    this.calls = [];
    this.signals = new Map();
    this.verdicts = new Map();
  }

  async writeContract({ functionName, args }) {
    this.calls.push({ kind: "write", functionName, args });
    if (functionName === "register_signal") {
      const [subjectUrl, claim, primaryUrl, archiveUrl, contextUrl] = args;
      assert.match(subjectUrl, /raw\.githubusercontent\.com\/klopp78\/modelriskradar-genlayer\/main\/examples\/subject-profile\.md$/);
      assert.match(claim, /AI model\/API policy change/);
      assert.match(primaryUrl, /primary-evidence\.md$/);
      assert.match(archiveUrl, /raw\.githubusercontent\.com\/klopp78\/modelriskradar-genlayer\/main\/examples\/model-risk-archive\.md$/);
      assert.match(contextUrl, /context-note\.md$/);
      this.signals.set(signalId, {
        signal_id: signalId,
        reporter: walletAddress.toLowerCase(),
        claim,
        subject_url: subjectUrl,
        baseline: {
          baseline_hash: "a".repeat(64),
          snapshot_commitments: [{ source_type: "subject" }, { source_type: "primary_evidence" }, { source_type: "archive" }, { source_type: "context" }],
        },
        verdict_ids: [],
        state: "registered",
      });
      return "0xregisterSignal";
    }
    if (functionName === "assess_signal") {
      const [submittedsignalId] = args;
      assert.equal(submittedsignalId, signalId);
      const record = this.signals.get(signalId);
      assert.ok(record, "signal must exist before assessment");
      this.verdicts.set(verdictId, {
        verdict_id: verdictId,
        signal_id: signalId,
        state: "finalized",
        evidence_bundle_hash: "b".repeat(64),
        assessment_context_hash: "c".repeat(64),
        snapshot_commitments: record.baseline.snapshot_commitments,
        consensus_result: {
          decision: "trusted",
          confidence: 88,
          subject_match: true,
          evidence_diverse: true,
          provenance_verified: true,
          risk_level: "low",
        },
      });
      record.state = "assessed";
      record.verdict_ids.push(verdictId);
      return "0xassessSignal";
    }
    throw new Error(`Unexpected write ${functionName}`);
  }

  async waitForTransactionReceipt({ hash }) {
    this.calls.push({ kind: "receipt", hash });
    if (hash === "0xregisterSignal") return { txExecutionResult: signalId };
    if (hash === "0xassessSignal") return { txExecutionResult: verdictId };
    throw new Error(`Unknown transaction ${hash}`);
  }

  async readContract({ functionName, args }) {
    this.calls.push({ kind: "read", functionName, args });
    if (functionName === "get_signal") return JSON.stringify(this.signals.get(args[0]) ?? {});
    if (functionName === "get_verdict") return JSON.stringify(this.verdicts.get(args[0]) ?? {});
    throw new Error(`Unexpected read ${functionName}`);
  }
}

function receiptString(receipt, pattern, label) {
  const value = Object.values(receipt).find(
    (candidate) => typeof candidate === "string" && pattern.test(candidate),
  );
  assert.ok(value, `Accepted ${label} receipt must contain its returned identifier`);
  return value;
}

async function runFullFlow(client) {
  const signalHash = await client.writeContract({
    functionName: "register_signal",
    args: [
      "https://raw.githubusercontent.com/klopp78/modelriskradar-genlayer/main/examples/subject-profile.md",
      "A newly announced AI model/API policy change should be treated as medium risk until independent evidence confirms its scope, rollout state, and mitigation details.",
      "https://github.com/klopp78/modelriskradar-genlayer/blob/main/examples/primary-evidence.md",
      "https://raw.githubusercontent.com/klopp78/modelriskradar-genlayer/main/examples/model-risk-archive.md",
      "https://github.com/klopp78/modelriskradar-genlayer/blob/main/examples/context-note.md",
    ],
  });
  const signalReceipt = await client.waitForTransactionReceipt({ hash: signalHash });
  const returnedSignalId = receiptString(signalReceipt, /^mrs_[a-f0-9]{20}$/, "signal");
  const signalRecord = JSON.parse(await client.readContract({
    functionName: "get_signal",
    args: [returnedSignalId],
  }));
  assert.equal(signalRecord.state, "registered");
  assert.equal(signalRecord.baseline.snapshot_commitments.length, 4);

  const verdictHash = await client.writeContract({
    functionName: "assess_signal",
    args: [returnedSignalId],
  });
  const verdictReceipt = await client.waitForTransactionReceipt({ hash: verdictHash });
  const returnedVerdictId = receiptString(verdictReceipt, /^mrv_[a-f0-9]{20}$/, "verdict");
  const verdict = JSON.parse(await client.readContract({
    functionName: "get_verdict",
    args: [returnedVerdictId],
  }));
  assert.equal(verdict.state, "finalized");
  assert.equal(verdict.consensus_result.decision, "trusted");
  assert.equal(verdict.consensus_result.provenance_verified, true);
  assert.equal(verdict.evidence_bundle_hash.length, 64);
  return { returnedSignalId, returnedVerdictId };
}

const simulator = new StudioFlowSimulator();
const outcome = await runFullFlow(simulator);
assert.deepEqual(
  simulator.calls.map((call) => `${call.kind}:${call.functionName ?? call.hash}`),
  [
    "write:register_signal",
    "receipt:0xregisterSignal",
    "read:get_signal",
    "write:assess_signal",
    "receipt:0xassessSignal",
    "read:get_verdict",
  ],
);
assert.equal(outcome.returnedSignalId, signalId);
assert.equal(outcome.returnedVerdictId, verdictId);
console.log("ModelRiskRadar simulated full-flow check passed");
