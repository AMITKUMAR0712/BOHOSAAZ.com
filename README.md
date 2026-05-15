This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Migrations (Prisma)

This project uses Prisma + MySQL. After pulling schema changes, apply migrations:

**Local development**

```bash
npx prisma migrate dev
```

**Production / CI**

```bash
npx prisma migrate deploy
```

If you need to regenerate the client:

```bash
npx prisma generate
```

### Vendor Panel: Support Tickets + Settings

New DB changes were added for vendor pickup/settings fields and vendor↔admin support tickets.

**Business rule (important):** Vendors must not see customer contact details (phone/email/address). Any customer communication is handled via Admin tickets.

**APIs**

- `GET /api/vendor/settings` – fetch vendor pickup/settings fields (approved vendors only)
- `PATCH /api/vendor/settings` – update pickup/settings fields (approved vendors only)
- `GET /api/vendor/support/tickets` – list vendor tickets (approved vendors only)
- `POST /api/vendor/support/tickets` – create a ticket (approved vendors only)
- `GET /api/vendor/support/tickets/:ticketId` – ticket metadata (approved vendors only)
- `GET /api/vendor/support/tickets/:ticketId/messages` – list messages (approved vendors only)
- `POST /api/vendor/support/tickets/:ticketId/messages` – send message to Admin (approved vendors only)

**Migration**

- Migration folder: `prisma/migrations/20251224093000_support_tickets/`
- Run one of the commands above to apply it.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
