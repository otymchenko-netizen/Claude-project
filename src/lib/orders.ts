import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Item {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // dollars, e.g. 4.99
}

export interface Order {
  id: string;
  userId: string;
  items: Item[];
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string; // ISO-8601
}

const DEFAULT_FILE = path.join(process.cwd(), "data", "orders.json");

// Serializes read-modify-write cycles within this process so concurrent
// requests can't overwrite each other's appends.
let queue: Promise<unknown> = Promise.resolve();

async function readOrders(file: string): Promise<Order[]> {
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
  return parsed as Order[];
}

export function appendOrder(order: Order, file: string = DEFAULT_FILE): Promise<void> {
  const run = async () => {
    await mkdir(path.dirname(file), { recursive: true });
    const orders = await readOrders(file);
    orders.push(order);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(orders, null, 2) + "\n", "utf8");
    await rename(tmp, file);
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}
