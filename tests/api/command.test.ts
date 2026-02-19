/**
 * Integration tests for POST /api/ai/command
 *
 * Tests the API route logic including auth checks, input validation,
 * and response structure. The actual LLM call is mocked for speed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock dependencies ─────────────────────────────────────────

// Mock next-auth session
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock our agent
vi.mock("@/lib/ai/agent", () => ({
  runBoardAgent: vi.fn(),
}));

// Mock auth options
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import { runBoardAgent } from "@/lib/ai/agent";

// Helper to create a mock NextRequest
function createMockRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
  } as any;
}

// Import the route handler
// Note: We import dynamically since Next.js route handlers have module-level exports
const routeModule = await import("@/app/api/ai/command/route");

describe("POST /api/ai/command — Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createMockRequest({ prompt: "test" });
    const res = await routeModule.POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as any);

    const req = createMockRequest({ prompt: "test" });
    const res = await routeModule.POST(req);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/ai/command — Input Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user123", name: "Test User" },
    } as any);
  });

  it("returns 400 for missing prompt", async () => {
    const req = createMockRequest({});
    const res = await routeModule.POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("prompt");
  });

  it("returns 400 for non-string prompt", async () => {
    const req = createMockRequest({ prompt: 123 });
    const res = await routeModule.POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = {
      json: () => Promise.reject(new Error("Invalid JSON")),
    } as any;

    const res = await routeModule.POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid JSON");
  });
});

describe("POST /api/ai/command — Success Path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user123", name: "Test" },
    } as any);
  });

  it("returns actions and reasoning on success", async () => {
    vi.mocked(runBoardAgent).mockResolvedValue({
      actions: [
        { type: "create_sticky", text: "Test", position: { x: 0, y: 0 }, color: "yellow" },
      ],
      reasoning: "Created a test sticky",
    });

    const req = createMockRequest({
      prompt: "Create a sticky note",
      boardState: { shapes: [] },
      boardId: "board-123",
    });

    const res = await routeModule.POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.actions).toHaveLength(1);
    expect(data.reasoning).toBe("Created a test sticky");
    expect(data.actionCount).toBe(1);
  });

  it("passes boardState and boardId to agent", async () => {
    vi.mocked(runBoardAgent).mockResolvedValue({
      actions: [],
      reasoning: "test",
    });

    const boardState = {
      shapes: [{ id: "s1", type: "note", x: 0, y: 0, props: {} }],
    };

    const req = createMockRequest({
      prompt: "organize",
      boardState,
      boardId: "my-board",
    });

    await routeModule.POST(req);

    expect(runBoardAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "organize",
        boardId: "my-board",
        userId: "user123",
      })
    );
  });

  it("defaults boardState to empty if not provided", async () => {
    vi.mocked(runBoardAgent).mockResolvedValue({
      actions: [],
      reasoning: "test",
    });

    const req = createMockRequest({ prompt: "brainstorm" });
    await routeModule.POST(req);

    expect(runBoardAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        boardState: { shapes: [] },
      })
    );
  });
});

describe("POST /api/ai/command — Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user123" },
    } as any);
  });

  it("returns 500 when agent returns error", async () => {
    vi.mocked(runBoardAgent).mockResolvedValue({
      actions: [],
      error: "LLM failed",
    });

    const req = createMockRequest({ prompt: "test" });
    const res = await routeModule.POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("LLM failed");
  });

  it("returns 500 when agent throws", async () => {
    vi.mocked(runBoardAgent).mockRejectedValue(new Error("Unexpected"));

    const req = createMockRequest({ prompt: "test" });
    const res = await routeModule.POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("try again");
  });

  it("returns 500 when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const req = createMockRequest({ prompt: "test" });
    const res = await routeModule.POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("OPENAI_API_KEY");
  });
});

describe("POST /api/ai/command — Runtime config", () => {
  it("exports nodejs runtime", () => {
    expect(routeModule.runtime).toBe("nodejs");
  });

  it("exports maxDuration of 30", () => {
    expect(routeModule.maxDuration).toBe(30);
  });
});
