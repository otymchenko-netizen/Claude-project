import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendOrder, type Order } from "./orders";

function makeOrder(id: string): Order {
  return {
    id,
    userId: "anonymous",
    items: [{ productId: "mug", name: "Coffee Mug", quantity: 2, unitPrice: 12.5 }],
    subtotal: 25,
    discount: 0,
    total: 25,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
}

describe("appendOrder", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "orders-"));
    file = path.join(dir, "nested", "orders.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates the file and array when missing", async () => {
    await appendOrder(makeOrder("a"), file);
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved.map((o: Order) => o.id)).toEqual(["a"]);
  });

  it("appends to an existing array", async () => {
    await appendOrder(makeOrder("a"), file);
    await appendOrder(makeOrder("b"), file);
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved.map((o: Order) => o.id)).toEqual(["a", "b"]);
  });

  it("rejects when the file is not a JSON array", async () => {
    await appendOrder(makeOrder("a"), file);
    await writeFile(file, "{}", "utf8");
    await expect(appendOrder(makeOrder("b"), file)).rejects.toThrow();
  });

  it("keeps every record under concurrent appends", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => appendOrder(makeOrder(`o${i}`), file)),
    );
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved).toHaveLength(20);
  });

  it("stores exactly the specified keys", async () => {
    await appendOrder(makeOrder("a"), file);
    const [order] = JSON.parse(await readFile(file, "utf8"));
    expect(Object.keys(order).sort()).toEqual(
      ["createdAt", "discount", "id", "items", "status", "subtotal", "total", "userId"],
    );
    expect(Object.keys(order.items[0]).sort()).toEqual(
      ["name", "productId", "quantity", "unitPrice"],
    );
  });
});
