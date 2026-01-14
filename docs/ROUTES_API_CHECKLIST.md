# Bohosaaz — Routes & API Checklist

This is a concrete checklist of pages and API endpoints (as observed in `next build` output) to validate flow consistency.

## Pages (i18n)
- `/{lang}`
- `/{lang}/about`
- `/{lang}/contact`
- `/{lang}/terms`
- `/{lang}/privacy`

## Pages (User)
- `/{lang}/login`
- `/{lang}/register`
- `/{lang}/p/[slug]`
- `/{lang}/cart`
- `/{lang}/checkout`
- `/{lang}/order/[orderId]`
- `/{lang}/account`
- `/{lang}/account/orders`
- `/{lang}/account/vendor-apply`

## Pages (Vendor)
- `/{lang}/vendor`
- `/{lang}/vendor/products`
- `/{lang}/vendor/orders`
- `/{lang}/vendor/payouts`

## Pages (Admin)
- `/{lang}/admin`
- `/{lang}/admin/vendors`
- `/{lang}/admin/categories`
- `/{lang}/admin/refunds`
- `/{lang}/admin/payouts`
- `/{lang}/admin/audit`
- `/{lang}/admin/system`

## APIs (Auth)
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/me` (legacy)

## APIs (Store)
- `GET /api/products`
- `GET /api/products/[slug]`
- `GET /api/categories`
- `POST /api/contact`

## APIs (Cart)
- `GET /api/cart`
- `POST /api/cart/add`
- `PATCH /api/cart/item/[itemId]`
- `DELETE /api/cart/item/[itemId]`

## APIs (Checkout)
- `POST /api/checkout/cod`

## APIs (Orders / Returns)
- `GET /api/orders`
- `GET /api/account/orders`
- `POST /api/orders/items/[id]/refund/request`

## APIs (Vendor)
- `POST /api/vendor/apply`
- `GET /api/vendor/orders`
- `PATCH /api/vendor/order-items/[itemId]`
- `GET /api/vendor/products`
- `POST /api/vendor/products`
- `PATCH /api/vendor/products/[productId]`
- `DELETE /api/vendor/products/[productId]`
- `POST /api/vendor/products/[productId]/images`
- `DELETE /api/vendor/products/[productId]/images/[imageId]`
- `POST /api/vendor/products/[productId]/images/[imageId]/primary`
- `GET /api/vendor/payouts`
- `POST /api/upload/signature`

## APIs (Admin)
- `GET /api/admin/analytics`
- `GET /api/admin/audit`
- `GET /api/admin/vendors`
- `POST /api/admin/vendors/[vendorId]/approve`
- `POST /api/admin/vendors/[vendorId]/reject`
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/[categoryId]`
- `DELETE /api/admin/categories/[categoryId]`
- `GET /api/admin/refunds`
- `POST /api/admin/refunds/[itemId]/approve`
- `GET /api/admin/payouts`
- `POST /api/admin/payouts/[id]/settle`
- `GET /api/admin/payouts/csv`

## APIs (Automation / Webhooks)
- `GET /api/cron/daily` (Bearer `CRON_SECRET`)
- `POST /api/webhooks/razorpay` (HMAC)
- `POST /api/webhooks/courier` (Bearer `COURIER_WEBHOOK_SECRET`)

## Known Cleanup Item
- `POST/PATCH /api/vendor/order-items/[itemId]/[id]` exists but is intentionally disabled (returns 404). The supported endpoint is `PATCH /api/vendor/order-items/[itemId]`.
