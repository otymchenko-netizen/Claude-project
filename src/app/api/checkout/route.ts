import { NextResponse } from "next/server";
import { calculateTotal, roundMoney, type CartItem } from "@/lib/pricing";
import { PRODUCTS } from "@/lib/products";
import { appendOrder, type Item, type Order } from "@/lib/orders";

function validate(body: unknown): { items?: CartItem[]; userId?: string; errors: string[] } {
  const errors: string[] = [];
  const { items: raw, userId } = (body ?? {}) as { items?: unknown; userId?: unknown };

  if (userId !== undefined && (typeof userId !== "string" || userId.length === 0)) {
    errors.push("userId must be a non-empty string");
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return { errors: [...errors, "items must be a non-empty array"] };
  }

  const items: CartItem[] = [];
  raw.forEach((entry, i) => {
    const { id, price, quantity } = (entry ?? {}) as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0) {
      errors.push(`items[${i}].id must be a non-empty string`);
    } else if (!PRODUCTS.some((p) => p.id === id)) {
      errors.push(`items[${i}].id is not a known product`);
    }
    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      Math.round(price * 100) / 100 !== price
    ) {
      errors.push(`items[${i}].price must be a non-negative number with at most 2 decimals`);
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      errors.push(`items[${i}].quantity must be a positive integer`);
    }
    if (errors.length === 0) {
      items.push({ id: id as string, price: price as number, quantity: quantity as number });
    }
  });

  return errors.length > 0
    ? { errors }
    : { items, userId: userId as string | undefined, errors };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: ["Invalid JSON body"] }, { status: 400 });
  }

  const { items, userId, errors } = validate(body);
  if (!items) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const orderItems: Item[] = items.map((item) => ({
    productId: item.id,
    name: PRODUCTS.find((p) => p.id === item.id)!.name,
    quantity: item.quantity,
    unitPrice: item.price,
  }));
  const subtotal = roundMoney(
    orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const total = calculateTotal(items);
  const order: Order = {
    id: crypto.randomUUID(),
    userId: userId ?? "anonymous",
    items: orderItems,
    subtotal,
    discount: roundMoney(subtotal - total),
    total,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };

  try {
    await appendOrder(order);
  } catch {
    return NextResponse.json({ errors: ["Could not save order"] }, { status: 500 });
  }

  return NextResponse.json({ orderId: order.id, total: order.total });
}
