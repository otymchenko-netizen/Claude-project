import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { recordRefund, type Refund } from "./refunds";

describe("recordRefund", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "refunds-"));
    file = path.join(dir, "nested", "refunds.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates the file and stores exactly the specified keys", async () => {
    const refund = await recordRefund("order-1", 499, 150, file);
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved).toEqual([refund]);
    expect(Object.keys(saved[0]).sort()).toEqual(["amount", "createdAt", "id", "orderId", "processingFee"]);
    expect(saved[0].amount).toBe(499);
    expect(saved[0].processingFee).toBe(150);
  });

  it("appends to an existing array", async () => {
    await recordRefund("order-1", 499, 150, file);
    await recordRefund("order-2", 1000, 0, file);
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved.map((r: Refund) => r.orderId)).toEqual(["order-1", "order-2"]);
  });

  it("rejects when the file is not a JSON array", async () => {
    await recordRefund("order-1", 499, 150, file);
    await writeFile(file, "{}", "utf8");
    await expect(recordRefund("order-2", 100, 0, file)).rejects.toThrow();
  });

  it("rejects invalid input without writing", async () => {
    await expect(recordRefund("", 499, 150, file)).rejects.toThrow();
    await expect(recordRefund("order-1", 0, 150, file)).rejects.toThrow();
    await expect(recordRefund("order-1", -1, 150, file)).rejects.toThrow();
    await expect(recordRefund("order-1", 4.99, 150, file)).rejects.toThrow();
    await expect(recordRefund("order-1", NaN, 150, file)).rejects.toThrow();
    await expect(recordRefund("order-1", 499, -1, file)).rejects.toThrow();
    await expect(recordRefund("order-1", 499, 1.5, file)).rejects.toThrow();
    await expect(readFile(file, "utf8")).rejects.toThrow();
  });

  it("keeps every record under concurrent calls", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => recordRefund(`o${i}`, 100, 0, file)),
    );
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved).toHaveLength(20);
  });
});
