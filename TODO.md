# Medical Support - Medicine Delivery Platform
## Master Task List

---

## Task 1: Project Setup & Database Schema
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `feature/project-setup`

- [ ] 1.1 Initialize Next.js 14 project with TypeScript, Tailwind, ESLint, App Router
- [ ] 1.2 Install core dependencies: `prisma`, `@prisma/client`, `stripe`, `socket.io`, `socket.io-client`, `@tanstack/react-query`, `next-auth`, `bcryptjs`, `@vercel/blob`
- [ ] 1.3 Install dev dependencies: `@types/node`, `@types/bcryptjs`, `typescript`
- [ ] 1.4 Initialize Prisma: `npx prisma init`
- [ ] 1.5 Create complete database schema (`prisma/schema.prisma`) with all models
- [ ] 1.6 Create database client (`src/lib/db/client.ts`)
- [ ] 1.7 Create `.env.example` with all required variables
- [ ] 1.8 Run initial migration: `npx prisma migrate dev --name init`
- [ ] 1.9 Create seed script (`prisma/seed.ts`) with sample medicines
- [ ] 1.10 Run seed: `npx prisma db seed`
- [ ] 1.11 Verify database connection and schema
- [ ] 1.12 Commit: `git commit -m "feat: initialize project with database schema"`

---

## Task 2: Authentication System
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `feature/authentication`

- [ ] 2.1 Create NextAuth config (`src/lib/auth/config.ts`) with credentials provider
- [ ] 2.2 Create API route for NextAuth (`src/app/api/auth/[...nextauth]/route.ts`)
- [ ] 2.3 Create login page (`src/app/(auth)/login/page.tsx`)
- [ ] 2.4 Create register page (`src/app/(auth)/register/page.tsx`)
- [ ] 2.5 Create auth form component (`src/components/ui/auth-form.tsx`)
- [ ] 2.6 Create registration API (`src/app/api/auth/register/route.ts`)
- [ ] 2.7 Create auth provider (`src/components/providers/auth-provider.tsx`)
- [ ] 2.8 Create auth layout (`src/app/(auth)/layout.tsx`)
- [ ] 2.9 Create useAuth hook (`src/hooks/useAuth.ts`)
- [ ] 2.10 Test login/register flow with different roles
- [ ] 2.11 Verify role-based session callbacks
- [ ] 2.12 Commit: `git commit -m "feat: implement authentication system with NextAuth"`

---

## Task 3: Medicine Catalog & Inventory
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `feature/medicine-catalog`

- [ ] 3.1 Create TypeScript types (`src/types/medicine.ts`)
- [ ] 3.2 Create medicine search API (`src/app/api/medicines/route.ts`)
- [ ] 3.3 Create inventory API (`src/app/api/inventory/route.ts`) - GET (public), PUT (pharmacy staff)
- [ ] 3.4 Create medicine card component (`src/components/customer/medicine-card.tsx`)
- [ ] 3.5 Create medicine search component (`src/components/customer/medicine-search.tsx`)
- [ ] 3.6 Create useMedicines hook (`src/hooks/useMedicines.ts`)
- [ ] 3.7 Test search with pincode filtering
- [ ] 3.8 Test inventory updates from pharmacy dashboard
- [ ] 3.9 Verify Rx badge displays correctly
- [ ] 3.10 Commit: `git commit -m "feat: implement medicine catalog and inventory system"`

---

## Task 4: Shopping Cart & Order Placement
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `feature/shopping-cart`

- [ ] 4.1 Create cart types (`src/types/cart.ts`)
- [ ] 4.2 Create cart context/provider (`src/components/customer/cart-provider.tsx`)
- [ ] 4.3 Create cart component (`src/components/customer/cart.tsx`)
- [ ] 4.4 Create useCart hook (from provider)
- [ ] 4.5 Create order API (`src/app/api/orders/route.ts`) - POST with validation
- [ ] 4.6 Implement prescription validation in order creation
- [ ] 4.7 Implement inventory availability check
- [ ] 4.8 Implement inventory decrement on order
- [ ] 4.9 Test cart: add/remove/update quantity, single pharmacy constraint
- [ ] 4.10 Test order creation with/without prescription
- [ ] 4.11 Test inventory decrement after order
- [ ] 4.12 Commit: `git commit -m "feat: implement shopping cart and order placement"`

---

## Task 5: Prescription Upload & Verification
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `feature/prescriptions`

- [ ] 5.1 Create prescription upload API (`src/app/api/prescriptions/route.ts`) - POST (upload), GET (list)
- [ ] 5.2 Create prescription verification API (`src/app/api/prescriptions/[id]/verify/route.ts`)
- [ ] 5.3 Create prescription upload component (`src/components/customer/prescription-upload.tsx`)
- [ ] 5.4 Create prescription verifier component (`src/components/pharmacy/prescription-verifier.tsx`)
- [ ] 5.5 Create usePrescription hook (`src/hooks/usePrescription.ts`)
- [ ] 5.6 Test file upload to Vercel Blob (JPEG, PNG, PDF)
- [ ] 5.7 Test verification workflow: PENDING → VERIFIED/REJECTED
- [ ] 5.8 Test order blocking for Rx medicines without verified prescription
- [ ] 5.9 Verify audit trail: verifiedBy, verifiedAt, notes
- [ ] 5.10 Commit: `git commit -m "feat: implement prescription upload and verification system"`

---

## Task 6: Payment Integration (Stripe)
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `feature/payments`

- [ ] 6.1 Create Stripe utility (`src/lib/payment/stripe.ts`)
- [ ] 6.2 Create payment intent API (`src/app/api/payments/create-intent/route.ts`)
- [ ] 6.3 Create Stripe webhook handler (`src/app/api/payments/webhook/route.ts`)
- [ ] 6.4 Create checkout component (`src/components/customer/checkout.tsx`)
- [ ] 6.5 Configure Stripe CLI for local webhook testing
- [ ] 6.6 Test payment intent creation with order total + delivery fee
- [ ] 6.7 Test successful payment → webhook → order CONFIRMED
- [ ] 6.8 Test failed payment handling
- [ ] 6.9 Verify metadata includes orderId, orderNumber
- [ ] 6.10 Commit: `git commit -m "feat: implement Stripe payment integration"`

---

## Task 7: Real-time Order Tracking
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `feature/order-tracking`

- [ ] 7.1 Create Socket.IO server (`src/lib/socket.ts`) on port 3001
- [ ] 7.2 Create order status update API (`src/app/api/orders/[id]/status/route.ts`)
- [ ] 7.3 Create order tracker component (`src/components/customer/order-tracker.tsx`)
- [ ] 7.4 Create useOrderTracking hook (`src/hooks/useOrderTracking.ts`)
- [ ] 7.5 Implement status transition validation
- [ ] 7.6 Create tracking event on every status change
- [ ] 7.7 Test real-time updates: pharmacy updates → customer sees live
- [ ] 7.8 Test connection/disconnection handling
- [ ] 7.9 Verify status steps: CONFIRMED → PACKING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
- [ ] 7.10 Commit: `git commit -m "feat: implement real-time order tracking with WebSocket"`

---

## Task 8: Rider Assignment & Delivery
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `feature/rider-delivery`

- [ ] 8.1 Create rider availability API (`src/app/api/riders/available/route.ts`)
- [ ] 8.2 Create rider assignment API (`src/app/api/riders/assign/route.ts`)
- [ ] 8.3 Create OTP verification API (`src/app/api/riders/verify-otp/route.ts`)
- [ ] 8.4 Create delivery requests component (`src/components/rider/delivery-requests.tsx`)
- [ ] 8.5 Create OTP verification component (`src/components/rider/otp-verification.tsx`)
- [ ] 8.6 Implement distance calculation (Haversine formula)
- [ ] 8.7 Test rider goes online with GPS location
- [ ] 8.8 Test nearby rider discovery (5km radius)
- [ ] 8.9 Test assignment: generates OTP, sets order OUT_FOR_DELIVERY
- [ ] 8.10 Test OTP verification → DELIVERED, rider available again
- [ ] 8.11 Test rider notifications via Socket.IO
- [ ] 8.12 Commit: `git commit -m "feat: implement rider assignment and OTP delivery verification"`

---

## Task 9: Role-based Dashboards
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `feature/dashboards`

- [ ] 9.1 Create customer layout (`src/app/(customer)/layout.tsx`) with sidebar
- [ ] 9.2 Create customer homepage (`src/app/(customer)/page.tsx`) with search + cart + prescription
- [ ] 9.3 Create pharmacy layout (`src/app/(pharmacy)/layout.tsx`) with sidebar
- [ ] 9.4 Create pharmacy homepage (`src/app/(pharmacy)/page.tsx`) with prescription verifier + order manager
- [ ] 9.5 Create rider layout (`src/app/(rider)/layout.tsx`) with sidebar
- [ ] 9.6 Create rider homepage (`src/app/(rider)/page.tsx`) with delivery requests + OTP
- [ ] 9.7 Create sidebar components for each role
- [ ] 9.8 Test role-based routing and access control
- [ ] 9.9 Test end-to-end flow: customer orders → pharmacy verifies → rider delivers
- [ ] 9.10 Commit: `git commit -m "feat: implement role-based dashboard layouts"`

---

## Task 10: Testing & Documentation
**Priority:** Medium | **Status:** ⬜ Not Started | **Branch:** `feature/testing-docs`

- [ ] 10.1 Install testing dependencies: `@testing-library/react`, `@testing-library/jest-dom`, `jest`, `jest-environment-jsdom`
- [ ] 10.2 Configure Jest for Next.js
- [ ] 10.3 Create auth API tests (`tests/api/auth.test.ts`)
- [ ] 10.4 Create orders API tests (`tests/api/orders.test.ts`)
- [ ] 10.5 Create component tests (`tests/components/medicine-search.test.tsx`)
- [ ] 10.6 Create README.md with setup instructions
- [ ] 10.7 Run all tests: `npm test`
- [ ] 10.8 Run lint: `npm run lint`
- [ ] 10.9 Run typecheck: `npm run typecheck` (or `npx tsc --noEmit`)
- [ ] 10.10 Fix any failing tests or lint errors
- [ ] 10.11 Commit: `git commit -m "feat: add tests and documentation"`

---

## Task 11: GitHub Push & Deployment Prep
**Priority:** High | **Status:** ⬜ Not Started | **Branch:** `main`

- [ ] 11.1 Initialize git repository (if not done)
- [ ] 11.2 Add remote: `git remote add origin https://github.com/Hayato-ultra/medical_support.git`
- [ ] 11.3 Push all feature branches
- [ ] 11.4 Create PRs for each feature branch
- [ ] 11.5 Merge PRs to main after review
- [ ] 11.6 Verify main branch builds and tests pass
- [ ] 11.7 Tag first release: `git tag -a v0.1.0-mvp -m "MVP Release"`

---

## Summary Statistics
- **Total Tasks:** 11
- **Total Subtasks:** ~110
- **Estimated Duration:** 7 weeks (MVP)
- **Current Progress:** 0/110 subtasks completed