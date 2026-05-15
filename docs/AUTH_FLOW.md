# Bohosaaz — Auth & RBAC Flow Diagram

This document focuses specifically on authentication, role-based routing, and where enforcement happens.

## Key Rules
- Roles: `USER`, `VENDOR`, `ADMIN`
- Protected areas (strictly isolated): `/{lang}/account/*`, `/{lang}/vendor/*`, `/{lang}/admin/*`
- Non-approved vendors (`vendor.status !== APPROVED`) are redirected to `/{lang}/account/vendor-apply`.
- Wrong role access to a protected area redirects to `/403`.
- Enforcement layers:
  - **Middleware**: coarse role isolation by path.
  - **Server layouts/pages**: final guardrails + vendor approval gating.
  - **APIs**: `requireAdmin()` / vendor checks per route.

## Diagram (Mermaid)
```mermaid
flowchart TD
  A[Visit protected route] --> B{Has token cookie?}
  B -- No --> L[Redirect to /{lang}/login?next=...]
  B -- Yes --> C{middleware path check}

  C -->|/admin| D{role == ADMIN?}
  D -- No --> R1[Redirect to /403]
  D -- Yes --> P[Allow request]

  C -->|/account| U{role == USER?}
  U -- No --> R2[Redirect to /403]
  U -- Yes --> P

  C -->|/vendor| V{role == VENDOR?}
  V -- No --> R3[Redirect to /403]
  V -- Yes --> S{vendor approved? (server layout/API)}
  S -- No --> VA[Redirect to /{lang}/account/vendor-apply]
  S -- Yes --> P
```

## Login Redirect Logic
- After successful login, client calls `/api/auth/me` and routes:
  - `ADMIN` → `/{lang}/admin`
  - `VENDOR` → if approved → `/{lang}/vendor`, else → `/{lang}/account/vendor-apply`
  - `USER` → `/{lang}/account`
- Optional `next` is accepted only if:
  - it is an internal safe path, and
  - it is inside the role’s allowed area.
