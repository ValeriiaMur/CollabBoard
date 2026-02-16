# TypeScript Rules

## Strict Typing

- **Never use `any`**. Use `unknown` when the type is truly uncertain, then narrow with type guards.
- Enable `strict: true` in `tsconfig.json` — no exceptions.
- Prefer explicit return types on exported functions and component props.
- Use `interface` for object shapes and `type` for unions/intersections.
- Leverage generics over type assertions. Avoid `as` casts unless absolutely necessary.

## Patterns

- Use discriminated unions for state variants (e.g., loading/error/success).
- Prefer `Record<K, V>` over index signatures where keys are known.
- Use `satisfies` operator to validate types without widening.
- Enums are discouraged — use `as const` objects or union literal types instead.
