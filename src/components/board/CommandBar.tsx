/**
 * Re-export from modular CommandBar directory.
 * The implementation lives in ./CommandBar/index.tsx with sub-components:
 *   - StatusBar.tsx  — Status display, progress bar, reasoning
 *   - QuickPrompts.tsx — Preset prompt buttons
 *   - InputArea.tsx  — Text input and submit controls
 *   - types.ts       — Shared TypeScript interfaces
 */
export { CommandBar } from "./CommandBar/index";
