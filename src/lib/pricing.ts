export interface CartItem {
  id: string;
  price: number; // dollars, e.g. 4.99
  quantity: number;
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculateTotal(items: CartItem[]): number {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // TODO: discount stacking (stub: no discounts applied yet)
  const discount = 0;

  return roundMoney(subtotal - discount);
}
