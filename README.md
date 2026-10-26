# Checkout Demo

Small Next.js (App Router) + TypeScript (strict) scaffold. No database, auth, or external services.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run test:ci
```

## Routes

- `GET /api/products` — hard-coded product list.
- `POST /api/checkout` — validates a cart (`{ items: [{ id, price, quantity }] }`) and returns a stubbed `{ orderId, total }`. Money is floating-point dollars (e.g. `4.99`), rounded to 2 decimals in `src/lib/pricing.ts`.

## Request lifecycle (today)

1. The user clicks **Place order** on `/checkout` (`src/app/checkout/page.tsx`).
2. The page `fetch`es `POST /api/checkout` with the selected items as JSON.
3. The route handler (`src/app/api/checkout/route.ts`) parses the body; invalid JSON → `400`.
4. It validates each item (non-empty `id`, non-negative price with ≤ 2 decimals, positive integer quantity); failures → `400 { errors }`.
5. Valid carts go to `calculateTotal` in `src/lib/pricing.ts` (discount stacking is a stub).
6. The handler returns `200 { orderId, total }`. Nothing is stored.
7. The page renders the order ID and total, or the validation errors.

## Request lifecycle (future: DB write)

Steps 1–5 stay the same, with these additions:

- Re-price items from DB product prices instead of trusting the client's `price`.
- After pricing, a service layer persists the order (and its items) in a single transaction, guarded by an idempotency key so retries don't double-charge.
- The handler returns the persisted order ID; the payment step would hook in between pricing and the write.

There is no database dependency today.
