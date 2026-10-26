# Architecture

Next.js 15 App Router + TypeScript (strict). Orders are persisted to a local JSON file; there is no database, auth, or external service.

## Components

| Component | File | Responsibility |
|---|---|---|
| Checkout page | `src/app/checkout/page.tsx` | Client UI: loads products, collects quantities, posts the cart, renders the result or errors. |
| Products route | `src/app/api/products/route.ts` | `GET /api/products`, serves the catalog. |
| Checkout route | `src/app/api/checkout/route.ts` | `POST /api/checkout`: parses and validates the payload, prices the cart, builds the order, persists it, returns `{ orderId, total }`. |
| Pricing | `src/lib/pricing.ts` | Pure money math: `calculateTotal` and `roundMoney`. Discount stacking is a stub. Changes require review. |
| Catalog | `src/lib/products.ts` | Hard-coded `PRODUCTS` list. |
| Order store | `src/lib/orders.ts` | `appendOrder`: appends to `data/orders.json`. |

## Checkout request flow

1. The user clicks **Place order**; the page sends `POST /api/checkout` with `{ items: [{ id, price, quantity }] }`.
2. The route parses the body. Invalid JSON returns `400 { errors }`.
3. `validate` checks each item (known product ID, non-negative price with at most 2 decimals, positive integer quantity) and the optional `userId`. Failures return `400 { errors }`.
4. The route computes the subtotal, calls `calculateTotal`, and derives `discount = subtotal - total`.
5. The route builds an `Order` (UUID, `status: "confirmed"`, ISO `createdAt`, line items with a name and price snapshot).
6. `appendOrder` writes it to `data/orders.json`. A failure returns `500 { errors }`.
7. The route returns `200 { orderId, total }`.

## Key design decisions

**Pricing is a pure module.**
Easy to test and reason about, and free of I/O. Cost: it returns only a total, so the route derives the subtotal and discount itself. That derivation will break once real discount stacking lands; pricing should return a `{ subtotal, discount, total }` breakdown (a reviewed change to `pricing.ts`).

**The server trusts the client-sent `price`.**
This keeps the stub simple, but the stored `unitPrice` is whatever the client sent, so persisted orders can carry wrong prices. Planned fix: re-price from `PRODUCTS` (later the DB) in a service layer before calling `calculateTotal`. This needs no change to `pricing.ts`.

**File-based persistence, serialized in-process.**
`appendOrder` reads the array, appends, writes a temp file and renames it. The rename gives atomic replacement, and a promise queue serializes concurrent requests in one process. Trade-offs:
- Each write rewrites the whole file, so cost grows with order count.
- The queue does not protect multiple processes or instances, so concurrent writes can be lost there.
- It assumes a writable filesystem under `process.cwd()`, which serverless hosts often don't provide.
- There is no idempotency key, so a retried request creates a second order.

**Line items snapshot name and price.**
`Item` stores `name` and `unitPrice` at purchase time, so later catalog changes don't rewrite history. Keep this when moving to a database.

**Money is floating-point dollars.**
Rounded to 2 decimals in `roundMoney` only. Simple for a demo, but a database should store integer cents (or `NUMERIC`). Migrating existing JSON means converting with `Math.round(x * 100)`.

**Hand-rolled validation in the route.**
No schema library, which keeps dependencies minimal. The cost is verbose code that mixes HTTP concerns with business rules.

**Plain CSS and no database dependency.**
Project rules (see `CLAUDE.md`). A database migration would conflict with the "no database dependency" rule and needs an explicit decision to change it.

## Evolution path

If persistence outgrows the JSON file (multiple instances, querying, concurrency), the changes are mostly local:

1. Add a service layer (`placeOrder`) that re-prices, builds the order and persists it, leaving the route as HTTP-only.
2. Put persistence behind a small `OrderRepository { insert(order) }` interface. The JSON implementation stays for dev and tests.
3. Make the catalog a repository too, so displayed and charged prices share one source.
4. Store money as integer cents; write the order and its items in one transaction.
5. Add an idempotency key with a unique constraint so retries return the original order.
6. Use `pending` rather than `confirmed` once a payment step exists.

The page, shape validation and pure pricing code are unaffected by these steps.
