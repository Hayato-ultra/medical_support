# Medical Support - Progress Tracking

## Current Phase: Core journey verified end to end

### Overall Progress
- **Fully done:** 6/11 tasks
- **Partial:** 5/11 tasks (payments, tracking, rider delivery, testing, deployment)
- **Blocked:** Production credentials for Razorpay, MSG91 and object storage

---

## Task Status Overview

| Task | Name | Status |
|------|------|--------|
| 1 | Project Setup & Database | Done |
| 2 | Authentication System | Done |
| 3 | Medicine Catalog & Inventory | Done |
| 4 | Shopping Cart & Orders | Done |
| 5 | Prescriptions | Done |
| 6 | Payments (Razorpay) | Partial - simulated checkout, HMAC webhook ready |
| 7 | Order Tracking | Partial - polling and progress UI, no live push |
| 8 | Rider Assignment & Delivery | Partial - auto-assign and OTP done, no routing |
| 9 | Role-based Dashboards | Done |
| 10 | Testing & Verification | Partial - 56-check HTTP suite, no unit tests |
| 11 | GitHub Push & Deployment | Partial - pushed, not deployed |

---

## What Works Today
- Public catalogue with relevance search, Rx filtering and out-of-stock
  alternatives, served from SQLite with no login required.
- Registration with phone OTP, then NextAuth credentials login. Delivery OTPs
  are never returned outside development.
- Cart and checkout with server-side pincode serviceability, prescription
  ownership checks, and inventory pricing.
- Orders start at `PENDING_PAYMENT`; the payment webhook is what promotes them,
  so unpaid work never reaches the pharmacy queue.
- Prescription verification, pharmacy fulfilment, automatic rider assignment on
  packing, and delivery confirmed only by the customer's 6-digit code.
- Cancellation releases stock and refunds only money that actually captured.

---

## Verification

| Check | Command | Result |
|-------|---------|--------|
| End-to-end HTTP | `node scripts/smoke-public.mjs` | 56 pass / 0 fail |
| Schema and seed | `node scripts/verify-schema.mjs` | 6/6 tables, 27 medicines, 27 inventory, 14 Rx |
| Test-data cleanup | `node scripts/clean-smoke-data.mjs` | repeatable |
| Types | `npx tsc --noEmit` | clean |
| Build | `npx next build` | clean |

The smoke suite cleans up before and after itself, so it can be re-run
concurrently-safe against a local dev server.

---

## Notable Engineering Decisions
- Prisma 8's SQLite ORM uses query-builder writes: `where({ id }).update(data)`.
  It has no nested relation writes, so order lines are inserted one by one.
- Foreign keys are enforced without cascades, so all deletes are explicit and
  ordered.
- The database is tracked in git, so it must never contain OTP codes or test
  accounts; `scripts/clean-smoke-data.mjs` enforces that.

---

## Remaining Work
1. Real Razorpay checkout and signed webhooks.
2. Transactional registration and order creation, plus reservation expiry.
3. Partial-prescription orders.
4. Pharmacy and rider onboarding fields.
5. Unit tests for catalogue scoring and lifecycle rules.
6. `turbopack.root` in `next.config.ts`.
7. Deployment.

---

*Last Updated: 2026-09-26*
