"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface OrderResult {
  orderId: string;
  total: number;
}

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [result, setResult] = useState<OrderResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: { products: Product[] }) => setProducts(data.products))
      .catch(() => setErrors(["Could not load products."]));
  }, []);

  async function placeOrder() {
    const items = products
      .filter((p) => (quantities[p.id] ?? 0) > 0)
      .map((p) => ({ id: p.id, price: p.price, quantity: quantities[p.id] }));

    setSubmitting(true);
    setResult(null);
    setErrors([]);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data as OrderResult);
      } else {
        setErrors((data as { errors?: string[] }).errors ?? ["Checkout failed."]);
      }
    } catch {
      setErrors(["Network error."]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1>Checkout</h1>
      {products.map((p) => (
        <div className="card" key={p.id}>
          <div>
            <strong>{p.name}</strong>
            <div className="muted">${p.price.toFixed(2)}</div>
          </div>
          <input
            type="number"
            min={0}
            step={1}
            aria-label={`Quantity for ${p.name}`}
            value={quantities[p.id] ?? 0}
            onChange={(e) =>
              setQuantities({ ...quantities, [p.id]: Number(e.target.value) })
            }
          />
        </div>
      ))}
      <button className="button" onClick={placeOrder} disabled={submitting}>
        {submitting ? "Placing order…" : "Place order"}
      </button>
      {result && (
        <div className="card stack">
          <strong>Order placed</strong>
          <span>Order ID: {result.orderId}</span>
          <span>Total: ${result.total.toFixed(2)}</span>
        </div>
      )}
      {errors.length > 0 && (
        <div className="card stack error">
          {errors.map((e) => (
            <span key={e}>{e}</span>
          ))}
        </div>
      )}
    </>
  );
}
