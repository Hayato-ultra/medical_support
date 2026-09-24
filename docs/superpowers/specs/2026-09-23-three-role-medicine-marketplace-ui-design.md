# Three-Role Medicine Marketplace UI Design Spec

**Date:** 2026-09-23
**Status:** Approved for implementation
**Branch:** main (no commits yet)

---

## 1. Overview

Complete UI overhaul for a three-sided medicine delivery marketplace with distinct apps per role:
- **Customer**: Marketplace, prescription upload, order tracking
- **Pharmacy**: Order queue, inventory management, prescription verification
- **Rider**: Delivery assignments, navigation, OTP confirmation

---

## 2. Architecture

### Route Groups (Next.js App Router)
```
/src/app/
├── (auth)/                    # Shared: login, register
├── (customer)/                # Customer marketplace
│   ├── layout.tsx             # Customer nav + auth guard
│   ├── page.tsx               # Medicine grid + search
│   ├── cart/page.tsx          # Shopping cart
│   ├── checkout/page.tsx      # Address + payment
│   ├── orders/page.tsx        # Order history
│   └── orders/[id]/page.tsx   # Order timeline + tracking
├── (pharmacy)/                # Pharmacy dashboard
│   ├── layout.tsx             # Pharmacy nav + auth guard
│   ├── page.tsx               # Dashboard overview
│   ├── orders/page.tsx        # Order queue (PENDING → DELIVERED)
│   ├── inventory/page.tsx     # Stock management CRUD
│   └── prescriptions/page.tsx # Verification queue
├── (rider)/                   # Rider delivery app
│   ├── layout.tsx             # Rider nav + auth guard
│   ├── page.tsx               # Assignment list
│   ├── active/[id]/page.tsx   # Live delivery + map
│   └── history/page.tsx       # Completed deliveries
└── (admin)/                   # Future: analytics, user management
```

### Role-Based Auth Guards
- `useAuth()` hook returns `user?.role`
- Each layout checks role, redirects to `/login` or correct app
- Middleware (`src/middleware.ts`) enforces at edge

---

## 3. Design System: shadcn/ui + Tailwind 4

### Installation
```bash
npx shadcn@latest add button input card table dialog toast tabs navigation-menu select textarea label avatar badge separator scroll-area sheet
```

### Theme Configuration (`src/lib/utils.ts`, `globals.css`)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221 83% 53%;           /* Trust blue */
  --primary-foreground: 210 40% 98%;
  --secondary: 142 76% 36%;         /* Safety green */
  --secondary-foreground: 0 0% 100%;
  --accent-customer: 221 83% 53%;   /* Blue */
  --accent-pharmacy: 142 76% 36%;   /* Green */
  --accent-rider: 25 95% 53%;       /* Orange */
  --radius: 0.75rem;
}
```

### Role Accent Variants
- `.accent-customer` — blue primary actions
- `.accent-pharmacy` — green primary actions
- `.accent-rider` — orange primary actions

---

## 4. Shared Components (`@/components/ui/`)

| Component | Purpose | shadcn Base |
|-----------|---------|-------------|
| `Button` | Primary/secondary/ghost/destructive | `button` |
| `Input` | Form fields | `input` |
| `Card` | Content containers | `card` |
| `Table` | Data grids (orders, inventory) | `table` |
| `Dialog` | Modals (prescription viewer, OTP) | `dialog` |
| `Toast` | Notifications | `toast` |
| `Tabs` | Sub-navigation | `tabs` |
| `Select` | Dropdowns (status, pharmacy picker) | `select` |
| `Textarea` | Notes, descriptions | `textarea` |
| `Label` | Form labels | `label` |
| `Avatar` | User/rider photos | `avatar` |
| `Badge` | Status pills (PENDING, DELIVERED) | `badge` |
| `Separator` | Visual dividers | `separator` |
| `ScrollArea` | Virtualized lists | `scroll-area` |
| `Sheet` | Mobile side panels | `sheet` |

---

## 5. Role-Specific Components

### Pharmacy (`@/components/pharmacy/`)
| Component | Description |
|-----------|-------------|
| `OrderCard` | Order summary with status stepper, customer info, items, actions |
| `OrderQueue` | Filterable table (status, date, customer), real-time polling |
| `InventoryTable` | Editable grid: medicine, quantity, price, batch, expiry |
| `PrescriptionViewer` | Modal with PDF/image zoom, approve/reject actions |
| `StatusBadge` | Color-coded: PENDING(amber), CONFIRMED(blue), PACKING(purple), READY_FOR_PICKUP(teal), OUT_FOR_DELIVERY(orange), DELIVERED(green), CANCELLED(red) |
| `PharmacyStats` | Dashboard cards: pending orders, low stock, today's revenue |

### Customer (`@/components/customer/`)
| Component | Description |
|-----------|-------------|
| `MedicineCard` | Image, name, manufacturer, price, "Add to Cart", prescription badge |
| `MedicineGrid` | Searchable, filterable (category, prescription required), infinite scroll |
| `PrescriptionUploader` | Drag-drop + camera capture, preview, OCR hint |
| `CartDrawer` | Slide-over cart (Sheet), quantity, pharmacy picker |
| `CheckoutForm` | Address selector, delivery slot, payment (Stripe Elements) |
| `OrderTimeline` | Vertical stepper: PLACED → CONFIRMED → PACKING → READY → OUT → DELIVERED |
| `PharmacyPicker` | Nearby pharmacies with distance, rating, estimated prep time |

### Rider (`@/components/rider/`)
| Component | Description |
|-----------|-------------|
| `DeliveryCard` | Pickup/dropoff addresses, customer phone, status, accept/start buttons |
| `AssignmentList` | Filterable: available, active, completed; pull-to-refresh |
| `MapView` | Leaflet/MapLibre: route, rider location, pickup/dropoff markers |
| `OTPInput` | 4-digit code entry, auto-focus, paste support, verify button |
| `StatusStepper` | Horizontal: ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED |
| `EarningsCard` | Today/week/month totals, per-delivery breakdown |

---

## 6. Data Layer

### TanStack Query Hooks (`@/lib/queries/`)
```typescript
// Pharmacy
useOrders(filters)          // paginated, 5s polling
useOrder(id)                // single order, 2s polling
useInventory(filters)       // paginated
useCreateInventory()        // mutation
useUpdateInventory()        // mutation
usePrescriptions(filters)   // verification queue

// Customer
useMedicines(filters)       // search, category, pagination
useCart()                   // client-state + sync
useCreateOrder()            // mutation
useOrderTracking(id)        // 3s polling for timeline

// Rider
useAssignments(status)      // 10s polling
useActiveDelivery(id)       // 2s polling + location
useVerifyOTP()              // mutation
```

### Real-Time Upgrade (Phase 2)
```typescript
// @/lib/socket.ts
import { io } from 'socket.io-client';
export const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  auth: { token: getAccessToken() },
  autoConnect: false,
});

// Hooks
export function useOrderStatus(orderId: string) { ... }
export function useRiderLocation(deliveryId: string) { ... }
export function useInventoryAlerts(pharmacyId: string) { ... }
```

---

## 7. Error Handling & UX

- **Optimistic UI**: TanStack Query `onMutate` for instant feedback
- **Error Toasts**: Standardized via `useToast()` hook
- **Loading States**: Skeleton loaders for tables/grids
- **Empty States**: Illustrated empty states with CTAs
- **Offline Banner**: Detect connectivity, queue mutations

---

## 8. Accessibility

- Semantic HTML, ARIA labels on all interactive elements
- Focus management in Dialogs/Sheets
- Keyboard navigation for all custom components
- Color contrast ≥ 4.5:1 (WCAG AA)
- Screen reader announcements for status changes

---

## 9. Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest + React Testing Library | Components, hooks, utils |
| Integration | Playwright | Critical flows (order → delivery) |
| Visual | chrome-devtools-mcp | Screenshot regression |
| E2E | Playwright | Full role journeys |

---

## 10. Implementation Order

1. **Setup** (Day 1): shadcn/ui, theme, route groups, auth guards, design tokens
2. **Pharmacy Dashboard** (Days 2-4): Order queue, inventory, prescriptions
3. **Customer Marketplace** (Days 5-7): Medicine grid, prescription upload, cart/checkout
4. **Rider App** (Days 8-10): Assignments, map, OTP flow
5. **Real-time Upgrade** (Days 11-12): Socket.IO, live status badges
6. **Polish & Testing** (Days 13-14): Accessibility, visual regression, E2E

---

## 11. Success Criteria

- ✅ Build passes (`npm run build`)
- ✅ Lint passes (`npm run lint`)
- ✅ All 3 role apps accessible via `/login` → role redirect
- ✅ Pharmacy: order status transitions work end-to-end
- ✅ Customer: can browse, upload prescription, place order
- ✅ Rider: can accept, navigate, confirm delivery via OTP
- ✅ chrome-devtools-mcp screenshots match design for each screen
- ✅ Graphify shows clean module boundaries per role