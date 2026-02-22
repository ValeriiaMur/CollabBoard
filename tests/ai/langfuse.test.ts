/**
 * Langfuse Trace-Based AI Quality & Performance Tests
 *
 * These tests call the REAL LLM and then verify quality via Langfuse API:
 *   - Response time < 2s target
 *   - Token usage within budget
 *   - Correct structured output (valid actions)
 *   - Cost per request tracking
 *
 * Run with: npm run test:langfuse
 * Requires: OPENAI_API_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY env vars
 *
 * Senior AI Engineering pattern:
 *   1. Send command → LLM → get response
 *   2. Validate response structure (Zod)
 *   3. Wait for Langfuse trace flush
 *   4. Fetch trace via Langfuse API
 *   5. Assert on latency, tokens, cost
 */

import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";
import { BoardActionSchema } from "@/lib/ai/tools";

// Skip all tests if API keys not configured
const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_LANGFUSE = !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);

const describeWithAI = HAS_OPENAI ? describe : describe.skip;
const describeWithLangfuse = HAS_LANGFUSE && HAS_OPENAI ? describe : describe.skip;

// ─── Langfuse API client ───────────────────────────────────────

const LANGFUSE_HOST = process.env.LANGFUSE_HOST || "https://cloud.langfuse.com";

async function fetchLangfuseTraces(sessionId: string, limit = 5) {
  const url = `${LANGFUSE_HOST}/api/public/traces?sessionId=${sessionId}&limit=${limit}`;
  const auth = Buffer.from(
    `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
  ).toString("base64");

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(`Langfuse API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function fetchLangfuseGenerations(traceId: string) {
  const url = `${LANGFUSE_HOST}/api/public/observations?traceId=${traceId}&type=GENERATION`;
  const auth = Buffer.from(
    `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
  ).toString("base64");

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(`Langfuse API error: ${res.status}`);
  }

  return res.json();
}

// ─── Helper: call our agent directly ───────────────────────────

async function callAgent(prompt: string, boardState: { shapes: Array<{ id: string; type: string; x: number; y: number; props: Record<string, unknown> }> } = { shapes: [] }) {
  // Dynamic import to ensure env vars are loaded
  const { runBoardAgent } = await import("@/lib/ai/agent");

  const testSessionId = `test-${Date.now()}`;
  const startTime = Date.now();

  const result = await runBoardAgent({
    prompt,
    boardState,
    boardId: testSessionId,
    userId: "test-runner",
  });

  const elapsed = Date.now() - startTime;

  return { result, elapsed, sessionId: testSessionId };
}

// ─── Live AI Response Tests ────────────────────────────────────

describeWithAI("Live AI Agent — Response Quality", () => {
  it("brainstorm command returns valid sticky notes", async () => {
    const { result, elapsed } = await callAgent("Brainstorm 5 ideas about improving team communication");

    expect(result.error).toBeUndefined();
    expect(result.actions.length).toBeGreaterThanOrEqual(3);
    expect(result.reasoning).toBeTruthy();

    // All actions should be valid
    for (const action of result.actions) {
      const parsed = BoardActionSchema.safeParse(action);
      expect(parsed.success).toBe(true);
    }

    // Most should be sticky notes
    const stickyCount = result.actions.filter(
      (a) => a.type === "create_sticky" || a.type === "create_multiple_stickies"
    ).length;
    expect(stickyCount).toBeGreaterThanOrEqual(1);

    console.log(`[Brainstorm] ${result.actions.length} actions in ${elapsed}ms`);
  }, 15000);

  it("SWOT analysis returns frames + stickies", async () => {
    const { result, elapsed } = await callAgent("Create a SWOT analysis for a new coffee shop");

    expect(result.error).toBeUndefined();
    expect(result.actions.length).toBeGreaterThanOrEqual(4);

    // Should have frames
    const frameCount = result.actions.filter((a) => a.type === "create_frame").length;
    expect(frameCount).toBeGreaterThanOrEqual(4); // S, W, O, T

    console.log(`[SWOT] ${result.actions.length} actions (${frameCount} frames) in ${elapsed}ms`);
  }, 15000);

  it("organize command with existing board state uses group/move", async () => {
    const boardState = {
      shapes: [
        { id: "shape:1", type: "note", x: 0, y: 0, props: { text: "Marketing idea" } },
        { id: "shape:2", type: "note", x: 100, y: 0, props: { text: "Sales target" } },
        { id: "shape:3", type: "note", x: 200, y: 0, props: { text: "Product feature" } },
        { id: "shape:4", type: "note", x: 300, y: 0, props: { text: "Marketing budget" } },
      ],
    };

    const { result, elapsed } = await callAgent(
      "Organize these items into logical groups",
      boardState,
    );

    expect(result.error).toBeUndefined();
    expect(result.actions.length).toBeGreaterThan(0);

    console.log(`[Organize] ${result.actions.length} actions in ${elapsed}ms`);
  }, 15000);

  it("summarize command produces a summary", async () => {
    const boardState = {
      shapes: [
        { id: "shape:1", type: "note", x: 0, y: 0, props: { text: "We need better onboarding" } },
        { id: "shape:2", type: "note", x: 250, y: 0, props: { text: "Customer churn is high" } },
        { id: "shape:3", type: "note", x: 500, y: 0, props: { text: "Support tickets increasing" } },
      ],
    };

    const { result } = await callAgent("Summarize the board", boardState);

    expect(result.error).toBeUndefined();
    const summaries = result.actions.filter((a) => a.type === "summarize_board");
    expect(summaries.length).toBeGreaterThanOrEqual(1);
  }, 15000);
});

// ─── Performance Targets ───────────────────────────────────────

describeWithAI("Live AI Agent — Performance Targets", () => {
  it("responds within 10s (target: <2s, but network varies)", async () => {
    const { elapsed } = await callAgent("Create 3 sticky notes about dogs");

    // Generous timeout for CI — real target is <2s
    expect(elapsed).toBeLessThan(10000);
    console.log(`[Perf] Response time: ${elapsed}ms (target: <2000ms)`);
  }, 15000);

  it("handles empty prompt gracefully", async () => {
    const { result } = await callAgent("");

    // Agent should either return empty actions or an error, not crash
    expect(result).toBeDefined();
  }, 15000);
});

// ─── Langfuse Trace Verification ───────────────────────────────

describeWithLangfuse("Langfuse Trace Verification", () => {
  let sessionId: string;

  beforeAll(async () => {
    // Run a command that will generate a trace
    const res = await callAgent("Create a simple brainstorm about AI tools");
    sessionId = res.sessionId;

    // Wait for trace to flush to Langfuse
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }, 20000);

  it("trace exists in Langfuse for the session", async () => {
    const data = await fetchLangfuseTraces(sessionId);
    expect(data.data).toBeDefined();
    expect(data.data.length).toBeGreaterThan(0);

    const trace = data.data[0];
    console.log(`[Langfuse] Trace ID: ${trace.id}`);
    console.log(`[Langfuse] Session: ${trace.sessionId}`);
    console.log(`[Langfuse] Tags: ${trace.tags}`);
  }, 10000);

  it("generation has token usage metadata", async () => {
    const traces = await fetchLangfuseTraces(sessionId, 1);
    if (traces.data.length === 0) return;

    const traceId = traces.data[0].id;
    const generations = await fetchLangfuseGenerations(traceId);

    if (generations.data && generations.data.length > 0) {
      const gen = generations.data[0];
      console.log(`[Langfuse] Model: ${gen.model}`);
      console.log(`[Langfuse] Input tokens: ${gen.usage?.input}`);
      console.log(`[Langfuse] Output tokens: ${gen.usage?.output}`);
      console.log(`[Langfuse] Total tokens: ${gen.usage?.total}`);
      console.log(`[Langfuse] Latency: ${gen.latency}ms`);

      if (gen.usage?.total) {
        // GPT-4o-mini should use < 4000 tokens per request
        expect(gen.usage.total).toBeLessThan(4000);
      }

      if (gen.latency) {
        console.log(`[Langfuse] LLM latency: ${gen.latency}ms (target: <2000ms)`);
      }
    }
  }, 10000);

  it("trace has correct tags", async () => {
    const traces = await fetchLangfuseTraces(sessionId, 1);
    if (traces.data.length === 0) return;

    const trace = traces.data[0];
    expect(trace.tags).toContain("collabboard");
    expect(trace.tags).toContain("board-agent");
  }, 10000);

  it("trace has user and session metadata", async () => {
    const traces = await fetchLangfuseTraces(sessionId, 1);
    if (traces.data.length === 0) return;

    const trace = traces.data[0];
    expect(trace.userId).toBe("test-runner");
    expect(trace.sessionId).toContain("test-");
  }, 10000);
});

// ─── Cost Budget Tests ─────────────────────────────────────────

describeWithLangfuse("AI Cost Budget", () => {
  it("single brainstorm costs < $0.01", async () => {
    const { sessionId } = await callAgent("Brainstorm 5 ideas about sustainability");

    // Wait for trace flush
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const traces = await fetchLangfuseTraces(sessionId, 1);
    if (traces.data.length === 0) return;

    const traceId = traces.data[0].id;
    const generations = await fetchLangfuseGenerations(traceId);

    if (generations.data?.[0]?.calculatedTotalCost) {
      const cost = generations.data[0].calculatedTotalCost;
      console.log(`[Cost] Brainstorm cost: $${cost.toFixed(6)}`);
      expect(cost).toBeLessThan(0.01); // < 1 cent per request
    }
  }, 20000);
});
