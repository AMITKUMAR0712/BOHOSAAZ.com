# Bohosaaz — Flow Map (End-to-End)

This document captures the intended “flow-wise and consistent” journeys across User, Vendor, and Admin roles with i18n routing via `/{lang}`.

## Locales & Routing
- Supported locales: `en`, `hi`
- Public pages exist in both forms:
  - Root (legacy): `/about`, `/contact`, ...
  - i18n (canonical): `/{lang}/about`, `/{lang}/contact`, ...
- Root `/` redirects to `/en`.

## Auth & Redirects
See also: [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md)

### Login / Register
1. User opens `/{lang}/login` or `/{lang}/register`.
2. On success, client resolver calls `GET /api/auth/me`.
3. Redirect decision:
   - **ADMIN** → `/{lang}/admin`
   - **VENDOR** → if `vendor.status === APPROVED` → `/{lang}/vendor` else `/{lang}/account/vendor-apply`
   - **USER** (default) → `/{lang}/account`
4. Optional `next` param is sanitized and normalized into the lang namespace when applicable.

### Protected Areas (middleware)
- Protected sections:
  - `/{lang}/account/*`, `/{lang}/vendor/*`, `/{lang}/admin/*`
  - (and their non-lang equivalents)
- If unauthenticated, redirect to `/{lang}/login?next=...`.

## USER Journey
### Browse → Product → Cart
1. Browse store: `/{lang}`.
2. View product: `/{lang}/p/[slug]`.
   - Product details fetched via `GET /api/products/[slug]`.
3. Add to cart:
   - `POST /api/cart/add` (requires auth)
4. View cart: `/{lang}/cart`
   - `GET /api/cart`
   - Update qty: `PATCH /api/cart/item/[itemId]`
   - Remove item: `DELETE /api/cart/item/[itemId]`

### Checkout (COD) → Orders
1. Checkout page: `/{lang}/checkout`
2. Place COD order:
   - `POST /api/checkout/cod`
   - Validates address fields, validates stock, decrements stock safely
   - Reprices items to current product price
   - Splits into **VendorOrders** per vendor and attaches `vendorOrderId` to each item
   - Final order status: `PLACED`
3. Confirmation page: `/{lang}/order/[orderId]`
4. Account orders: `/{lang}/account/orders`
   - `GET /api/orders`

### Returns / Refund Requests
1. From orders UI (delivered items): request return
   - `POST /api/orders/items/[id]/refund/request`
2. Rule: only `DELIVERED` items can be requested; status becomes `RETURN_REQUESTED`.

## VENDOR Journey
### Apply
1. Vendor application: `/{lang}/account/vendor-apply`
2. Submit application:
   - `POST /api/vendor/apply` → creates `Vendor` with `status=PENDING`

### After Approval
1. Vendor dashboard: `/{lang}/vendor`
2. Manage products: `/{lang}/vendor/products`
   - List/create: `GET/POST /api/vendor/products`
   - Update/delete: `PATCH/DELETE /api/vendor/products/[productId]`
   - Images:
     - Upload signature: `POST /api/upload/signature` (vendor/admin)
     - Attach image: `POST /api/vendor/products/[productId]/images`
     - Delete image: `DELETE /api/vendor/products/[productId]/images/[imageId]`
     - Set primary: `POST /api/vendor/products/[productId]/images/[imageId]/primary`
3. Fulfill orders: `/{lang}/vendor/orders`
   - List vendor-scoped items grouped into orders: `GET /api/vendor/orders`
   - Update item status/tracking: `PATCH /api/vendor/order-items/[itemId]`
     - Allowed statuses: `PLACED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`

## ADMIN Journey
### Vendor Approvals
1. Vendors list UI: `/{lang}/admin/vendors`
2. APIs:
   - List: `GET /api/admin/vendors` (admin)
   - Approve: `POST /api/admin/vendors/[vendorId]/approve` (admin)
   - Reject: `POST /api/admin/vendors/[vendorId]/reject` (admin)

### Categories
1. Categories UI: `/{lang}/admin/categories`
2. APIs:
   - List/create: `GET/POST /api/admin/categories`
   - Update/delete: `/api/admin/categories/[categoryId]`

### Products (Admin-owned)
1. Products UI: `/{lang}/admin/products`
2. APIs:
   - List/create: `GET/POST /api/admin/products`
   - Update/delete: `PATCH/DELETE /api/admin/products/[productId]`
   - Toggle active: `POST /api/admin/products/[productId]/active`
   - Images:
      - Upload signature: `POST /api/upload/signature` (vendor/admin)
      - Attach image: `POST /api/admin/products/[productId]/images`
      - Delete image: `DELETE /api/admin/products/[productId]/images/[imageId]`
      - Set primary: `POST /api/admin/products/[productId]/images/[imageId]/primary`

### Refunds (Return Requests)
1. Refunds UI: `/{lang}/admin/refunds`
2. APIs:
   - List pending: `GET /api/admin/refunds` → items with `RETURN_REQUESTED`
   - Approve refund: `POST /api/admin/refunds/[itemId]/approve`
     - Sets item status: `REFUNDED`
     - Recomputes order total (excluding refunded items)
     - Recomputes vendor order payout/commission if linked
     - Writes audit log entry

### Payouts
1. Payouts UI: `/{lang}/admin/payouts`
2. APIs:
   - List: `GET /api/admin/payouts`
   - Settle: `POST /api/admin/payouts/[id]/settle`
   - Export CSV: `GET /api/admin/payouts/csv`

## Automations & Webhooks
- Cron daily: `GET /api/cron/daily` (Bearer secret)
  - Auto-settle vendor orders after delay
  - Send refund reminders for `RETURN_REQUESTED`
- Razorpay webhook: `POST /api/webhooks/razorpay` (HMAC)
- Courier webhook: `POST /api/webhooks/courier` (Bearer secret)

