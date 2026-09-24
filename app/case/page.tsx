"use client";

import { useState } from "react";
import Link from "next/link";
import { registerSignal, MODEL_RISK_RADAR_CONTRACT_ADDRESS, type WalletAddress } from "@/lib/genlayer";
import { formatUiError } from "@/lib/ui-error";

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

export default function CasePage() {
  const [subjectUrl, setSubjectUrl] = useState("https://raw.githubusercontent.com/klopp78/modelriskradar-genlayer/main/examples/subject-profile.md");
  const [claim, setClaim] = useState("A newly announced AI model/API policy change should be treated as medium risk until independent evidence confirms its scope, rollout state, and mitigation details.");
  const [primaryEvidenceUrl, setPrimaryEvidenceUrl] = useState("https://github.com/klopp78/modelriskradar-genlayer/blob/main/examples/primary-evidence.md");
  const [archiveUrl, setArchiveUrl] = useState("https://raw.githubusercontent.com/klopp78/modelriskradar-genlayer/main/examples/model-risk-archive.md");
  const [contextUrl, setContextUrl] = useState("https://github.com/klopp78/modelriskradar-genlayer/blob/main/examples/context-note.md");
  const [reviewRun, setReviewRun] = useState(() => `review-${Date.now().toString(36)}`);
  const [address, setAddress] = useState(MODEL_RISK_RADAR_CONTRACT_ADDRESS);
  const [wallet, setWallet] = useState<WalletAddress | null>(null);
  const [message, setMessage] = useState("Connect a browser wallet to register a source-bound risk signal.");
  const [record, setRecord] = useState("");
  const [busy, setBusy] = useState(false);

  async function connectWallet() {
    if (!window.ethereum) throw new Error("No browser wallet detected.");
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as WalletAddress[];
    if (!accounts[0]) throw new Error("No wallet account returned.");
    setWallet(accounts[0]);
    return accounts[0];
  }

  async function submit() {
    try {
      setBusy(true);
      setRecord("");
      if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
        throw new Error("Enter a valid Studio contract address before registering.");
      }
      if (![subjectUrl, primaryEvidenceUrl, archiveUrl, contextUrl].every((url) => /^https?:\/\//i.test(url.trim()))) {
        throw new Error("All source fields must be absolute HTTP or HTTPS URLs.");
      }
      setMessage("Waiting for GenLayer validators to bind subject and evidence snapshots...");
      const account = wallet ?? (await connectWallet());
      const claimWithRun = `${claim.trim()}\n\nReview run: ${reviewRun.trim() || Date.now().toString(36)}`;
      const result = await registerSignal({
        walletAddress: account,
        subjectUrl: subjectUrl.trim(),
        claim: claimWithRun,
        primaryEvidenceUrl: primaryEvidenceUrl.trim(),
        archiveUrl: archiveUrl.trim(),
        contextUrl: contextUrl.trim(),
        contractAddress: address.trim() as `0x${string}`,
      });
      setRecord(typeof result.signalRecord === "string" ? result.signalRecord : JSON.stringify(result.signalRecord, null, 2));
      setMessage(`Risk signal accepted: ${result.signalId}`);
    } catch (error) {
      setMessage(formatUiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 text-[#161814]">
      <Link className="pill" href="/">ModelRiskRadar</Link>
      <h1 className="mt-7 text-4xl font-semibold">Register risk signal</h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-[#596452]">
        Create a mrs_* record that binds the subject, claim, evidence, archive,
        and context snapshots before any verdict is generated.
      </p>
      <section className="tool-panel mt-8 grid gap-4">
        <Field id="subject" label="Subject URL" value={subjectUrl} setValue={setSubjectUrl} />
        <TextArea id="claim" label="Claim to assess" value={claim} setValue={setClaim} />
        <Field id="primary" label="Primary evidence URL" value={primaryEvidenceUrl} setValue={setPrimaryEvidenceUrl} />
        <Field id="archive" label="Archive or source snapshot URL" value={archiveUrl} setValue={setArchiveUrl} />
        <Field id="context" label="Independent context URL" value={contextUrl} setValue={setContextUrl} />
        <Field id="review-run" label="Review run reference" value={reviewRun} setValue={setReviewRun} />
        <Field id="address" label="Studio contract address" value={address} setValue={setAddress} />
        <div className="flex flex-wrap gap-3">
          <button className="action-button" onClick={() => connectWallet().then(() => setMessage("Wallet connected.")).catch((error) => setMessage(formatUiError(error)))}>Connect wallet</button>
          <button className="action-button primary" disabled={busy} onClick={submit}>{busy ? "Awaiting consensus" : "Register signal"}</button>
        </div>
        <p className="text-xs text-[#6f7b67]">Uses standard wallet signing only. No MetaMask Snap is required; switch the wallet to Studionet before writing.</p>
        <p className="text-sm text-[#596452]">{message}</p>
      </section>
      {record ? <pre className="result-card mt-6 overflow-x-auto text-sm">{record}</pre> : null}
    </main>
  );
}

function Field({ id, label, value, setValue }: { id: string; label: string; value: string; setValue: (value: string) => void }) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input className="text-input" id={id} value={value} onChange={(event) => setValue(event.target.value)} />
    </label>
  );
}

function TextArea({ id, label, value, setValue }: { id: string; label: string; value: string; setValue: (value: string) => void }) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="field-label">{label}</span>
      <textarea className="text-input min-h-28" id={id} value={value} onChange={(event) => setValue(event.target.value)} />
    </label>
  );
}
