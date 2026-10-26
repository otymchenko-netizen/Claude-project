import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Refund {
  id: string;
  orderId: string;
  amount: number; // integer cents, e.g. 499 for $4.99
  processingFee: number; // integer cents, e.g. 150 for $1.50
  createdAt: string; // ISO-8601
}

const DEFAULT_FILE = path.join(process.cwd(), "data", "refunds.json");

// Serializes read-modify-write cycles within this process so concurrent
// calls can't overwrite each other's appends.
let queue: Promise<unknown> = Promise.resolve();

async function readRefunds(file: string): Promise<Refund[]> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error(`${file} does not contain a JSON array`);
  }
  return parsed as Refund[];
}

export function recordRefund(
  orderId: string,
  amount: number,
  processingFee: number,
  file: string = DEFAULT_FILE,
): Promise<Refund> {
  if (typeof orderId !== "string" || orderId.length === 0) {
    return Promise.reject(new Error("orderId must be a non-empty string"));
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return Promise.reject(new Error("amount must be a positive integer (cents)"));
  }
  if (!Number.isInteger(processingFee) || processingFee < 0) {
    return Promise.reject(new Error("processingFee must be a non-negative integer (cents)"));
  }

  const refund: Refund = {
    id: crypto.randomUUID(),
    orderId,
    amount,
    processingFee,
    createdAt: new Date().toISOString(),
  };

  const run = async () => {
    await mkdir(path.dirname(file), { recursive: true });
    const refunds = await readRefunds(file);
    refunds.push(refund);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(refunds, null, 2) + "\n", "utf8");
    await rename(tmp, file);
    return refund;
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}
