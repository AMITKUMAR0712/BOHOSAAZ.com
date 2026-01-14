# Bohosaaz Runbook

## Requirements
- Node.js 18.18+ (recommended: Node.js 20 LTS)
- MySQL 8+

## Setup
1) Install deps
- `npm install`

2) Configure env
- Copy `.env.example` → `.env`
- Fill `DATABASE_URL` and `JWT_SECRET` at minimum
- Also set `NEXT_PUBLIC_APP_URL` (required by runtime env validation)

3) Migrate DB
- `npx prisma migrate deploy`

4) Seed (optional)
- `npm run seed`

## Local dev
- `npm run dev`

## Production build
- `npm run build`
- `npm run start`

### cPanel (Node.js App)
- Set the app to run `npm run build` once (or build locally and upload `.next/` if your workflow requires it).
- Use `npm run start` for the startup command; it respects `PORT`.
- If your host runs `npm install` in an environment where Prisma native binaries are blocked/locked, you can skip the auto-generate step: set `SKIP_PRISMA_GENERATE=1`.

## Operational notes
- Auth uses `token` cookie (JWT). Server-side RBAC is enforced via middleware and server layouts.
- Vendor dashboard access requires vendor approval.

## Integrations
### Wallet + Razorpay
Wallet topups use Razorpay Checkout.
- Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- If using the webhook route (`/api/webhooks/razorpay`), set `RAZORPAY_WEBHOOK_SECRET`

### Cloudinary
Required for product image uploads.
- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Rate limiting (Upstash)
If set, rate limiting is applied to auth and checkout routes.
- Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Webhooks / Cron
Endpoints exist/are intended to be protected via shared secrets.
- Set `CRON_SECRET` for `/api/cron/daily`.
- Optional tuning: `PAYOUT_DELAY_DAYS`, `REFUND_REMINDER_DAYS`.
- `WEBHOOK_SECRET` remains as a placeholder for custom webhooks.
