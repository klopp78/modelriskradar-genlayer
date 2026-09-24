export function formatUiError(error: unknown): string {
  if (error instanceof Error && error.message) return friendlyMessage(error.message);
  if (typeof error === "string") return friendlyMessage(error);

  const rendered = renderUnknown(error);
  return friendlyMessage(rendered || "The request failed. Check the wallet, contract address, and source URLs, then try again.");
}

function renderUnknown(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = record.message ?? record.reason ?? record.error ?? record.details ?? record.shortMessage;
    if (direct && direct !== value) {
      const rendered = renderUnknown(direct);
      if (rendered) return rendered;
    }

    try {
      return JSON.stringify(value, (_key, nested) => (typeof nested === "bigint" ? nested.toString() : nested), 2);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }

  return String(value);
}

function friendlyMessage(message: string): string {
  if (message.includes("wallet_getSnaps")) {
    return "This app does not require MetaMask Snaps. Your wallet rejected a Snap capability check; refresh the page, connect with a standard EIP-1193 wallet, and switch to Studionet before submitting.";
  }
  if (message.includes("signal_already_registered")) {
    return "This exact signal was already registered. Change the review run reference or claim text, then register again.";
  }
  if (message === "[object Object]") {
    return "The wallet or contract returned an object-shaped error. Open the browser console for details, or try a fresh review run reference.";
  }
  return message;
}
