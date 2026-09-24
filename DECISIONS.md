# Medical Support - Medicine Delivery Platform
## Architectural & Technical Decisions Log

---

### Project Overview
**Goal:** Three-sided medicine delivery marketplace (Customers ↔ Pharmacies ↔ Riders)
**Scope:** Single city zone, 2-3 pincodes, 500 SKUs, 2 pharmacies for MVP
**Timeline:** 7-week MVP

---

## Core Architecture Decisions

### 1. Framework & Runtime
**Decision:** Next.js 14 with App Router + TypeScript
- **Rationale:** Full-stack React framework with server components, API routes, and built-in optimizations
- **Alternative Considered:** Express + React SPA, Remix
- **Status:** ✅ Decided

### 2. Database & ORM
**Decision:** PostgreSQL + Prisma ORM
- **Rationale:** Type-safe database access, migrations, excellent TypeScript integration
- **Alternative Considered:** MongoDB + Mongoose, Supabase (PostgreSQL but managed)
- **Schema Highlights:**
  - Three user roles: CUSTOMER, PHARMACY_STAFF, RIDER, ADMIN
  - Medicine with prescription requirement flag
  - Inventory per pharmacy with quantity/price
  - Prescription workflow: PENDING → VERIFIED/REJECTED
  - Order status flow: PENDING → CONFIRMED → PACKING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
  - Tracking events for audit trail
- **Status:** ✅ Decided

### 3. Authentication
**Decision:** NextAuth.js (Auth.js) with Credentials Provider
- **Rationale:** Built-in session management, JWT tokens, role-based callbacks
- **Password Hashing:** bcryptjs (12 rounds)
- **Session Strategy:** JWT with role claim
- **Alternative Considered:** Clerk, Supabase Auth, custom JWT
- **Status:** ✅ Decided

### 4. Real-time Communication
**Decision:** Socket.IO on separate port (3001)
- **Rationale:** Reliable WebSocket with fallback, rooms for order-specific updates
- **Architecture:** Separate Node.js process from Next.js
- **Events:** `join-order`, `leave-order`, `order-update`
- **Alternative Considered:** Pusher, Ably, Supabase Realtime, Next.js Server-Sent Events
- **Status:** ✅ Decided

### 5. Payment Processing
**Decision:** Stripe Payment Intents
- **Rationale:** Industry standard, handles 3D Secure, Indian cards (INR), webhooks for async confirmation
- **Flow:** Create Intent → Client confirms → Webhook updates order status
- **Delivery Fee:** Fixed ₹30 for MVP
- **Alternative Considered:** Razorpay (India-specific), PayPal
- **Status:** ✅ Decided

### 6. File Storage (Prescriptions)
**Decision:** Vercel Blob Storage
- **Rationale:** Serverless-compatible, public URLs, simple API
- **Path Structure:** `prescriptions/{userId}/{timestamp}-{filename}`
- **Validation:** JPEG, PNG, PDF only, max 5MB
- **Alternative Considered:** AWS S3, Cloudinary, local filesystem
- **Status:** ✅ Decided

### 7. State Management
**Decision:** React Context + TanStack Query (React Query)
- **Rationale:** Server state via React Query, client state via Context
- **Cart:** Context provider (single pharmacy constraint)
- **Server Data:** React Query with caching, invalidation
- **Alternative Considered:** Redux, Zustand, SWR
- **Status:** ✅ Decided

### 8. Styling
**Decision:** Tailwind CSS
- **Rationale:** Utility-first, rapid UI development, small bundle, dark mode ready
- **Components:** Custom UI primitives + composite components per role
- **Status:** ✅ Decided

---

## Feature-Specific Decisions

### 9. Prescription Verification Workflow
**Decision:** Two-phase - Customer uploads → Pharmacist verifies
- **Status Flow:** PENDING → VERIFIED (approved) / REJECTED
- **Rx Gate:** Order creation blocked for Rx medicines without VERIFIED prescription
- **Audit Trail:** VerifiedBy (pharmacist ID), VerifiedAt, Notes stored
- **Legal Compliance:** Non-negotiable per requirements
- **Status:** ✅ Decided

### 10. Inventory Management
**Decision:** Real-time per-pharmacy inventory with quantity tracking
- **Visibility:** Customers see only medicines with quantity > 0 in their pincode
- **Reservation:** Inventory decremented at order creation (optimistic)
- **Restock:** Pharmacy staff can update quantity/price via API
- **Expiry Tracking:** Batch number + expiry date fields (for future use)
- **Status:** ✅ Decided

### 11. Order Flow & Status Machine
**Decision:** Explicit status enum with defined transitions
```
PENDING → CONFIRMED (payment success)
CONFIRMED → PACKING (pharmacy starts)
PACKING → READY_FOR_PICKUP (pharmacy done)
READY_FOR_PICKUP → OUT_FOR_DELIVERY (rider assigned)
OUT_FOR_DELIVERY → DELIVERED (OTP verified)
Any → CANCELLED
```
- **Tracking Events:** Every status change creates immutable TrackingEvent
- **Audit:** Location snapshots at key transitions
- **Status:** ✅ Decided

### 12. Rider Assignment & Delivery
**Decision:** Nearest-available rider assignment with OTP verification
- **Discovery:** Pharmacy/rider requests nearby riders (5km radius)
- **Assignment:** Manual or auto-assign to nearest available rider
- **OTP:** 6-digit numeric, generated at assignment, stored in TrackingEvent
- **Verification:** Rider enters OTP from customer → marks DELIVERED
- **Rider Availability:** Toggle online/offline with GPS location
- **Status:** ✅ Decided

### 13. Pharmacy Constraints
**Decision:** Single pharmacy per order
- **Cart Limitation:** Can only add items from one pharmacy at a time
- **Rationale:** Simplifies logistics, single pickup point
- **Future:** Multi-pharmacy orders in v2
- **Status:** ✅ Decided

### 14. Search & Discovery
**Decision:** Pincode-based medicine search with pharmacy inventory join
- **Query:** Search by name/manufacturer + pincode filter
- **Response:** Medicines with available inventory at nearby pharmacies
- **Sorting:** By price (lowest first), then distance
- **Pagination:** Limit 50 for MVP
- **Status:** ✅ Decided

---

## Infrastructure & DevOps Decisions

### 15. Development Environment
**Decision:** Local PostgreSQL + Redis + Node.js
- **Database:** PostgreSQL 15+ (local or Docker)
- **Cache/Realtime:** Redis 7+ (for future session/cache, Socket.IO adapter)
- **Node:** 20+ LTS
- **Package Manager:** npm (or pnpm)
- **Status:** ✅ Decided

### 16. Environment Configuration
**Decision:** `.env` for secrets, `.env.example` for template
- **Required Variables:**
  - `DATABASE_URL` - PostgreSQL connection string
  - `NEXTAUTH_SECRET` - 32+ char random string
  - `NEXTAUTH_URL` - `http://localhost:3000` (dev)
  - `STRIPE_SECRET_KEY` - Stripe test secret key
  - `STRIPE_PUBLISHABLE_KEY` - Stripe test publishable key
  - `STRIPE_WEBHOOK_SECRET` - From Stripe CLI
  - `REDIS_URL` - `redis://localhost:6379`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side Stripe key
  - `NEXT_PUBLIC_SOCKET_URL` - `http://localhost:3001`
- **Status:** ✅ Decided

### 17. Git Strategy
**Decision:** Trunk-based development with feature branches
- **Main Branch:** `main` (protected)
- **Feature Branches:** `feature/task-name` from plan
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`)
- **PR Required:** Yes, with CI checks
- **Auto-deploy:** Vercel on merge to main (future)
- **Status:** ✅ Decided

### 18. Testing Strategy
**Decision:** Unit + Integration tests with Jest + React Testing Library
- **API Tests:** Test route handlers with test database
- **Component Tests:** Render with mocked hooks/providers
- **E2E:** Playwright (future, not in MVP)
- **Coverage Target:** 70%+ for critical paths (auth, orders, payments)
- **Status:** ✅ Decided

---

## MVP Scope Boundaries (Explicit Exclusions)

| Feature | Status | Reason |
|---------|--------|--------|
| Multi-city / multi-zone | ❌ Excluded | MVP is single zone |
| Chronic care / subscriptions | ❌ Excluded | Post-MVP |
| Lab tests / teleconsultation | ❌ Excluded | Out of scope |
| Insurance integration | ❌ Excluded | Complex, post-MVP |
| Narcotics / Schedule X / Cold-chain | ❌ Excluded | Regulatory complexity |
| Discounts / loyalty / coupons | ❌ Excluded | Focus on reliable delivery |
| Multi-pharmacy orders | ❌ Excluded | Logistics complexity |
| Rider app (native mobile) | ❌ Excluded | PWA sufficient for MVP |
| Admin analytics dashboard | ❌ Excluded | Basic order mgmt only |

---

## Decision Review Checkpoints

Before moving to each new phase, confirm:

- [ ] **Phase 1 (Setup):** Database schema reviewed, migrations run, seed data works
- [ ] **Phase 2 (Auth):** Login/register works, roles enforced, session persists
- [ ] **Phase 3 (Catalog):** Search returns medicines with inventory, pincode filter works
- [ ] **Phase 4 (Cart/Orders):** Cart respects single pharmacy, order creates + decrements inventory
- [ ] **Phase 5 (Prescriptions):** Upload → pending → verify → order allowed/blocked correctly
- [ ] **Phase 6 (Payments):** Stripe test mode works, webhook updates order to CONFIRMED
- [ ] **Phase 7 (Tracking):** Socket.IO connects, status updates propagate in real-time
- [ ] **Phase 8 (Riders):** Rider sees requests, accepts, OTP verifies delivery
- [ ] **Phase 9 (Dashboards):** All three role dashboards functional
- [ ] **Phase 10 (Polish):** Tests pass, lint clean, deployed to preview

---

## Change Log

| Date | Decision | Changed By | Reason |
|------|----------|------------|--------|
| 2026-09-22 | Initial decisions documented | AI Assistant | Project kickoff |

---

**Next Review:** After Task 1 (Project Setup) completion