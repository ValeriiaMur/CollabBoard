/**
 * POST /api/ai/command
 *
 * AI Board Agent API endpoint.
 * Accepts a natural language command + current board state,
 * returns structured board manipulation actions.
 *
 * Uses Server-Sent Events (SSE) for streaming visual feedback:
 *   1. "thinking" event — AI is processing
 *   2. "action" events — individual board actions as they're generated
 *   3. "done" event — all actions complete
 *   4. "error" event — if something goes wrong
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runBoardAgent, type BoardState } from "@/lib/ai/agent";

export const runtime = "nodejs"; // Cloud Run — no edge timeout issues
export const maxDuration = 30; // 30 second timeout

export async function POST(req: NextRequest) {
  // ─── Auth check ─────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── Parse request ──────────────────────────────────────
  let prompt: string;
  let boardState: BoardState;
  let boardId: string;

  try {
    const body = await req.json();
    prompt = body.prompt;
    boardState = body.boardState || { shapes: [] };
    boardId = body.boardId || "unknown";

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'prompt' field" },
        { status: 400 }
      );
    }

    // Guard against excessively long prompts (token exhaustion)
    if (prompt.length > 10_000) {
      return NextResponse.json(
        { error: "Prompt too long. Maximum 10,000 characters." },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // ─── Check API key is configured ───────────────────────
  if (!process.env.OPENAI_API_KEY) {
    console.error("[/api/ai/command] OPENAI_API_KEY not configured");
    return NextResponse.json(
      { error: "AI service unavailable. Please contact the administrator." },
      { status: 503 }
    );
  }

  // ─── Run AI agent ──────────────────────────────────────
  try {
    const startTime = Date.now();

    const result = await runBoardAgent({
      prompt,
      boardState,
      boardId,
      userId: session.user.id,
    });

    const durationMs = Date.now() - startTime;

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          actions: [],
          reasoning: null,
          durationMs,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      actions: result.actions,
      reasoning: result.reasoning,
      actionCount: result.actions.length,
      durationMs,
    });
  } catch (error) {
    console.error("[/api/ai/command] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "AI agent failed. Please try again.",
        actions: [],
      },
      { status: 500 }
    );
  }
}
