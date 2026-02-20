# AI Development Log — CollabBoard

## Tools & Workflow

CollabBoard's AI agent was built using **LangChain JS** (orchestration), **OpenAI GPT-4o-mini** (LLM), **Zod** (schema validation), and **Langfuse** (observability/cost tracking). The workflow follows a structured-output pattern: user prompts and serialized board state are sent to GPT-4o-mini in JSON mode, which returns an array of typed board actions. These actions are validated against a Zod discriminated union of 13 action schemas, then executed client-side against the tldraw editor API. Langfuse traces every LLM call with session/user metadata, enabling latency monitoring and cost attribution per board.

Multiple AI coding tools were used throughout development: **Claude Code** for scaffolding, refactoring, and test generation; **GitHub Copilot** for inline code completion and autosuggestions; and **ChatGPT** for code reviews, requirements analysis, brainstorming architectural approaches, and comparing implementation strategies (e.g., Yjs vs Liveblocks, PartyKit vs Cloudflare Durable Objects). Using multiple tools together allowed us to cross-check outputs, catch blind spots, and iterate faster — each tool had different strengths depending on the task.

## MCP Usage

No external MCP servers were used at runtime. During development, Claude Code with its built-in tools (file read/write, bash, grep, glob) was used for agentic coding tasks — scaffolding the agent architecture, writing tests, and debugging integration issues. ChatGPT was used conversationally for requirements review, brainstorming feature approaches, and comparing technology trade-offs before implementation. The Langfuse integration acts as the observability layer that an MCP-based tracing server would typically provide.

## Effective Prompts

1. **System prompt — tool schema enforcement**: *"Every action object in the 'actions' array MUST have a 'type' field set to one of these EXACT strings: create_sticky, create_multiple_stickies, create_text, create_shape..."* — Eliminated type invention by GPT-4o-mini.
2. **Board-state context injection**: *"CURRENT BOARD STATE (N items): [{id, type, x, y, text}...]"* — Appended to every user message so the LLM can reason about existing content, avoid overlaps, and reference shape IDs.
3. **Layout guidelines in system prompt**: *"Sticky notes are roughly 200x200 pixels. Space them at least 230px apart. For brainstorming, use a grid layout starting from (-400, -300)."* — Produced clean, readable layouts without post-processing.
4. **Template examples**: *"SWOT Analysis: Create 4 frames (Strengths, Weaknesses, Opportunities, Threats) in a 2x2 grid, each ~500x400. Add a few starter stickies inside each."* — One-shot examples for common templates dramatically improved output quality.
5. **Type normalization fallback**: A 25+ entry alias map (e.g., `createSticky → create_sticky`, `note → create_sticky`) catches LLM type-name drift, improving reliability from ~85% to ~99% parse success.

## Code Analysis

Approximately **95% AI-generated, 5% hand-written** (across Claude Code, Copilot, and ChatGPT combined). Claude Code generated the initial scaffolding for the agent (`agent.ts`, `tools.ts`, `executeActions.ts`), all Zod schemas, and test suites. Copilot assisted with inline completions during implementation. ChatGPT was used for reviewing requirements against the spec, brainstorming system prompt strategies, and comparing architectural options. Hand-written work focused on the type normalization map, Langfuse integration tuning, Yjs↔tldraw sync logic in `useYjsStore.ts`, the PartyKit server, and production hardening (error boundaries, timeout handling, cleanup refs).

## Strengths & Limitations

**Where AI excelled**: Generating Zod schemas for all 13 action types, writing comprehensive test suites (agent, tools, executeActions, API route, Langfuse integration — 1,600+ lines), scaffolding the LangChain integration boilerplate, and iterating on system prompt wording. AI was especially strong at producing structured, repetitive code like switch-case action handlers.

**Where it struggled**: Getting tldraw-specific APIs right (shape creation props, editor method signatures) required manual correction. The Yjs↔tldraw sync bridge had subtle race conditions (echo loops, out-of-order events) that AI couldn't debug without human guidance. Firebase credential configuration and environment-specific issues (platform-specific native binaries, ADC token expiration) required domain knowledge beyond what the LLM could infer from code alone.

## Key Learnings

Structured output (JSON mode + Zod validation) is the single most impactful pattern for AI agents — it eliminates free-form parsing and makes the LLM output deterministic enough for programmatic consumption. A type-alias normalization layer is essential because even with explicit instructions, LLMs occasionally invent type names. One-shot examples in the system prompt (like the SWOT template) are worth more than paragraphs of instructions. Finally, Langfuse tracing is invaluable — without it, debugging latency spikes and cost attribution across users would be guesswork.

---

## AI Cost Analysis

### Development & Testing Costs

| Metric | Value |
|---|---|
| LLM API costs (OpenAI) | ~$0.80 |
| Input tokens consumed | ~320,000 |
| Output tokens consumed | ~85,000 |
| Total API calls | ~150 |
| Langfuse hosting | Free tier (50K observations/mo) |
| Other AI costs | $0 (no embeddings, no fine-tuning) |

### Production Cost Projections

**Assumptions**: 5 AI commands per user per session, 8 sessions per user per month, ~1,200 input tokens per command (system prompt + board state), ~500 output tokens per command. Using GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output.

| Scale | Commands/mo | Input tokens | Output tokens | Monthly cost |
|---|---|---|---|---|
| 100 users | 4,000 | 4.8M | 2.0M | **~$1.92** |
| 1,000 users | 40,000 | 48M | 20M | **~$19.20** |
| 10,000 users | 400,000 | 480M | 200M | **~$192** |
| 100,000 users | 4,000,000 | 4.8B | 2.0B | **~$1,920** |

At scale, costs are dominated by output tokens. Caching the system prompt (OpenAI prompt caching) could reduce input costs by ~50%. Batching multiple commands and response streaming could further optimize perceived latency without increasing token spend.
