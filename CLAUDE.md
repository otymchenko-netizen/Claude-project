# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- The payments / pricing module (`src/lib/pricing.ts`) must never be edited directly without review.
- Grid Dynamics uses TypeScript strict mode.
- No database dependency, ever. Styling is plain CSS only (`src/app/globals.css`): no Tailwind, UI libraries, or CSS-in-JS.
- All monetary values are stored as integer cents (e.g. $4.99 → 499), never floating-point dollars.
- `package.json` scripts are exactly `dev`, `build`, `test:ci`. There is no lint script.

## Commands

```bash
npm install && npm run dev   # http://localhost:3000
npm run build                # also type-checks under strict mode
npm run test:ci              # vitest run
npx vitest run src/lib/pricing.test.ts            # single file
npx vitest run -t "sums price"                    # single test by name
```

## Architecture

Next.js 15 App Router + TypeScript, `src/` layout, `@/*` → `src/*`. Persistence is plain JSON files under `data/` (gitignored); there is no database.

Checkout flow spans several files:
- `src/app/checkout/page.tsx` (client component) loads `GET /api/products`, then posts `{ items: [{ id, price, quantity }] }` to `POST /api/checkout`.
- `src/app/api/checkout/route.ts` hand-validates the payload (400 `{ errors }` on bad JSON or invalid items), computes the subtotal itself, calls `calculateTotal` from `src/lib/pricing.ts`, derives `discount = subtotal - total`, builds an `Order`, and saves it with `appendOrder`. Responds `{ orderId, total }` (500 `{ errors }` if the write fails).
- `src/lib/products.ts` holds the hard-coded `PRODUCTS` list, used by both the products route and checkout validation.
- `src/lib/orders.ts` (`appendOrder` → `data/orders.json`) and `src/lib/refunds.ts` (`recordRefund` → `data/refunds.json`) share one pattern: read the whole array, push, write a `.tmp` file, `rename` over the original, with an in-process promise queue serializing writers. This is safe for one Node process only. Both take an optional `file` argument, which the tests use with temp dirs.
- The server trusts the client-sent `price` (it only checks that the product ID exists), so stored `unitPrice` is client-chosen. Re-pricing from `PRODUCTS` is planned, not done.

Money: the rule above says integer cents, but the existing code (`pricing.ts`, `products.ts`, `orders.ts`, the checkout route and page) still uses floating-point dollars, rounded only by `roundMoney` in `src/lib/pricing.ts`. Only `refunds.ts` and `data/refunds.json` use cents. Discount stacking in `pricing.ts` is a TODO stub, so the route's `discount` derivation will break once it lands.

Every page shares one look via `<main className="container">` in `src/app/layout.tsx`, with `.card` / `.button` classes from the global stylesheet.

`README.md` documents the request lifecycle from the checkout click to a future DB write. `ARCHITECTURE.md` covers the design decisions and trade-offs.

## Project skill

`node .claude/skills/requirements-check/check.mjs` audits the fixed requirements (routes, scripts, pricing module). It still asserts floating-point dollars, which conflicts with the cents rule.
