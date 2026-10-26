import { describe, expect, it } from "vitest";
import { calculateTotal } from "./pricing";

describe("calculateTotal", () => {
  it("sums price x quantity in dollars", () => {
    expect(calculateTotal([{ id: "a", price: 4.99, quantity: 2 }])).toBe(9.98);
  });
});
