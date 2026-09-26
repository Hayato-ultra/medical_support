# Medical Support - Medicine Delivery Platform
## Master Task List

---

## Task 1: Project Setup & Database Schema — DONE
- Prisma 8 with SQLite configured
- Contract schema in `src/prisma/contract.prisma`
- `medical_support.db` created at root
- Contract emitted successfully
- Post-emit table changes applied by `node:sqlite` scripts in `scripts/`

## Task 2: Authentication System — DONE
- NextAuth with credentials provider
- Login/Register pages with shadcn/ui
- Register API with UUID generation, OTP verification
- SQLite-compatible references

## Task 3: Medicine Catalog & Inventory — DONE
- `/api/medicines` - GET search with token-scored relevance, Rx and stock filters
- `/api/inventory` - GET and PUT
- Canonical catalogue in `scripts/data/medicines.mjs`
- Idempotent repair via `scripts/normalize-catalog.mjs`

## Task 4: Shopping Cart & Order Placement — DONE
- CartProvider (add/remove/update/clear)
- Cart component and CartWidget
- `/api/orders` - POST and GET
- Checkout page with serviceability check and Rx step
- Orders list and order detail pages

## Task 5: Prescription Upload & Verification — DONE
- `/api/prescriptions` - POST (upload) and GET (list)
- `/api/prescriptions/library` - GET
- `/api/prescriptions/[id]/verify` - PATCH (verify/reject)
- Local upload serving with ownership check

## Task 6: Payment Integration (Razorpay) — PARTIAL
- [x] `/api/payments/create-intent` with payable-status gate
- [x] `/api/payments/webhook` with HMAC signature verification
- [x] Refund on cancellation of captured orders
- [ ] Real Razorpay order creation and checkout dialog
- [ ] Signed webhooks in production (`PAYMENTS_ALLOW_UNSIGNED` must be off)

## Task 7: Order Tracking — PARTIAL
- [x] `/api/orders/[id]/status` - role-gated transitions with payment gate
- [x] Tracking events on every status change
- [x] Order tracker UI with progress steps
- [x] Delivery OTP visible to the customer only
- [ ] Socket.IO live push (polling used instead)

## Task 8: Rider Assignment & Delivery — PARTIAL
- [x] Automatic rider assignment when an order is packed
- [x] Idle-rider selection and release on delivery/cancel
- [x] `/api/orders/[id]/verify-delivery` with 6-digit customer code
- [x] Riders restricted to their own assigned deliveries
- [ ] Distance calculation (Haversine) and route display
- [ ] Push notification to rider on assignment

## Task 9: Role-based Dashboards — DONE
- Customer Dashboard: `/dashboard`
- Pharmacy Dashboard: `/pharmacy`
- Rider Dashboard: `/rider`
- Orders page: `/orders`
- Medicine detail: `/medicines/[id]`
- Cart page: `/cart`

## Task 10: Testing & Verification — PARTIAL
- [x] `scripts/smoke-public.mjs` - 56-check end-to-end HTTP suite
- [x] `scripts/verify-schema.mjs` - schema and seed verification
- [x] `scripts/clean-smoke-data.mjs` - repeatable test-data cleanup
- [x] `npx tsc --noEmit` and `npx next build` clean
- [ ] Unit tests for catalogue scoring and lifecycle rules

## Task 11: GitHub Push & Deployment — PARTIAL
- Git repository initialized and pushed to `main`
- Build verified
- [ ] Production deployment

---

## Known Gaps
- Registration is not transactional: a failure after the user row is written
  leaves a partial account.
- Partial-prescription orders are all-or-nothing; a rejected prescription
  cancels the OTC lines too.
- Stock reservation has no expiry job, and order creation is not transactional.
- Pharmacy and rider signup forms do not collect licence/vehicle fields yet.
- `turbopack.root` is unset in `next.config.ts`, producing a build warning.

---

## Summary
- **Total Tasks:** 11
- **Fully done:** 6
- **Partial:** 5 (payments, tracking, rider delivery, testing, deployment)
