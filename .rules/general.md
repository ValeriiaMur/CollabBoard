# General Agent Rules

## Code Quality

- Write clean, readable code. Prefer clarity over cleverness.
- Follow DRY but don't abstract prematurely — duplication is cheaper than the wrong abstraction.
- Keep functions short and single-purpose.
- Use meaningful names: `getActiveUsers()` not `getData()`.

## Next.js Conventions

- Use the **App Router** (`app/` directory).
- Prefer **Server Components** by default. Only add `"use client"` when interactivity is needed.
- Use `loading.tsx`, `error.tsx`, and `not-found.tsx` for route-level states.
- API routes go in `app/api/` using Route Handlers.
- Use `next/image` for images, `next/link` for navigation.

## Git Practices

- Write clear, descriptive commit messages.
- Keep commits atomic — one logical change per commit.

## Do NOT

- Modify `.env`, `.env.local`, or any environment files.
- Install new dependencies without explicit approval.
- Modify CI/CD configs, Docker files, or infra without approval.
- Skip writing tests.
