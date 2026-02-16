# Test-Driven Development Rules

## Workflow

1. **Red** — Write a failing test first that describes the expected behavior.
2. **Green** — Write the minimum code to make the test pass.
3. **Refactor** — Clean up while keeping tests green.

## Guidelines

- Every new feature, component, or utility must have tests written **before** implementation.
- Tests live alongside source files: `Component.tsx` → `Component.test.tsx`.
- Aim for one assertion per test. Keep tests focused and descriptive.
- Name tests clearly: `it("renders error message when submission fails")`.

## What to Test

- **Components**: Rendering, user interactions, conditional displays, edge states.
- **Hooks**: Return values, state transitions, side effects.
- **Utilities**: Input/output, edge cases, error handling.
- **API routes**: Request/response, validation, error responses.

## What NOT to Test

- Implementation details (internal state, private methods).
- Third-party library internals.
- Styles or CSS class names.

## Tools

- Use **Jest** + **React Testing Library** for component and unit tests.
- Prefer `screen` queries and `userEvent` over `fireEvent`.
- Use **MSW** (Mock Service Worker) for mocking API calls — avoid mocking `fetch` directly.
