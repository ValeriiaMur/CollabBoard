# Component Architecture Rules

## Structure

- **Small & focused**: Each component does one thing. If it exceeds ~80 lines, split it.
- **Modular**: Components are self-contained and reusable across pages/features.
- **Flat hierarchy**: Avoid deeply nested component trees. Compose with children/slots.

## File Organization

```
src/
  components/
    ui/              # Generic reusable UI (Button, Input, Modal, Card)
    features/        # Feature-specific components (BoardCard, TaskList)
    layouts/         # Layout wrappers (Sidebar, Header, PageShell)
  hooks/             # Custom hooks, one per file
  lib/               # Utilities, helpers, constants
  types/             # Shared TypeScript types/interfaces
  app/               # Next.js App Router pages and routes
```

## Conventions

- One component per file. File name matches component name: `TaskCard.tsx` → `export function TaskCard`.
- Co-locate related files: `TaskCard.tsx`, `TaskCard.test.tsx`, `useTaskCard.ts`.
- Props get their own `interface` at the top of the file: `interface TaskCardProps { ... }`.
- Prefer named exports over default exports.
- Extract repeated logic into custom hooks (`use*.ts`).
- Extract repeated UI patterns into shared `ui/` components.

## State Management

- Keep state as local as possible. Lift only when siblings need to share.
- Use React context sparingly — only for truly global concerns (theme, auth).
- Prefer server components by default. Add `"use client"` only when needed.

## Composition Patterns

- Use `children` prop for flexible layouts.
- Use compound components for related groups (e.g., `Tabs`, `Tabs.List`, `Tabs.Panel`).
- Use render props or slot patterns when children need parent data.
