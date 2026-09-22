import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export const MODEL_RISK_RADAR_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_MODEL_RISK_RADAR_CONTRACT_ADDRESS ??
    "0xC188E9a3551a25AC78B3659245438C6dfd0e41c1") as `0x${string}`;

export type WalletAddress = `0x${string}`;

export type ChainReadOptions = {
  walletAddress?: WalletAddress;
  contractAddress?: `0x${string}`;
};

export type SignalInput = {
  walletAddress: WalletAddress;
  subjectUrl: string;
  claim: string;
  primaryEvidenceUrl: string;
  archiveUrl: string;
  contextUrl: string;
  contractAddress?: `0x${string}`;
};

export type AssessSignalInput = {
  walletAddress: WalletAddress;
  signalId: string;
  contractAddress?: `0x${string}`;
};

export function createModelRiskRadarClient(walletAddress?: WalletAddress) {
  return createClient({
    chain: studionet,
    account: walletAddress,
  });
}

function ModelRiskRadarAddress(contractAddress?: `0x${string}`) {
  return contractAddress ?? MODEL_RISK_RADAR_CONTRACT_ADDRESS;
}

export async function readSignal(signalId: string, options: ChainReadOptions = {}) {
  const client = createModelRiskRadarClient(options.walletAddress);
  return client.readContract({
    address: ModelRiskRadarAddress(options.contractAddress),
    functionName: "get_signal",
    args: [signalId],
    jsonSafeReturn: true,
    leaderOnly: true,
  });
}

export async function readVerdict(verdictId: string, options: ChainReadOptions = {}) {
  const client = createModelRiskRadarClient(options.walletAddress);
  return client.readContract({
    address: ModelRiskRadarAddress(options.contractAddress),
    functionName: "get_verdict",
    args: [verdictId],
    jsonSafeReturn: true,
    leaderOnly: true,
  });
}

export async function registerSignal({
  walletAddress,
  subjectUrl,
  claim,
  primaryEvidenceUrl,
  archiveUrl,
  contextUrl,
  contractAddress,
}: SignalInput) {
  const client = createModelRiskRadarClient(walletAddress);
  await client.connect("studionet");
  const address = ModelRiskRadarAddress(contractAddress);
  const hash = await client.writeContract({
    address,
    functionName: "register_signal",
    args: [subjectUrl, claim, primaryEvidenceUrl, archiveUrl, contextUrl],
    value: BigInt(0),
    leaderOnly: false,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    fullTransaction: true,
  });
  const signalId = idFromReceipt(receipt, /mrs_[a-f0-9]{20}/, "signal");
  const signalRecord = await readSignal(signalId, { walletAddress, contractAddress: address });
  return { hash, receipt, signalId, signalRecord };
}

export async function assessSignal({ walletAddress, signalId, contractAddress }: AssessSignalInput) {
  const client = createModelRiskRadarClient(walletAddress);
  await client.connect("studionet");
  const address = ModelRiskRadarAddress(contractAddress);
  const hash = await client.writeContract({
    address,
    functionName: "assess_signal",
    args: [signalId],
    value: BigInt(0),
    leaderOnly: false,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    fullTransaction: true,
  });
  const verdictId = idFromReceipt(receipt, /mrv_[a-f0-9]{20}/, "verdict");
  const verdict = await readVerdict(verdictId, { walletAddress, contractAddress: address });
  return { hash, receipt, verdictId, verdict };
}

function idFromReceipt(receipt: unknown, pattern: RegExp, label: string): string {
  const id = collectStrings(receipt)
    .map((value) => value.match(pattern)?.[0])
    .find((value): value is string => Boolean(value));
  if (!id) {
    throw new Error(`Accepted ${label} transaction did not return its ID.`);
  }
  return id;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
}
