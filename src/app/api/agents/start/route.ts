/**
 * POST /api/agents/start — Run AI agent personalities on a board
 *
 * Takes the board state from the client, runs Claude for each selected
 * personality, and returns the actions to be executed client-side.
 *
 * This avoids server-side Yjs connections — the client already has the
 * tldraw editor, so it executes the returned actions directly.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runClaudeAgent } from "@/lib/ai/claude-agent";
import { PERSONALITY_IDS, type PersonalityId } from "@/lib/ai/personalities";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { boardId, personalities, prompt, boardState } = await req.json();

    if (!boardId || typeof boardId !== "string") {
      return NextResponse.json({ error: "Missing boardId" }, { status: 400 });
    }
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
    if (!Array.isArray(personalities) || personalities.length === 0) {
      return NextResponse.json(
        { error: "Select at least one agent personality" },
        { status: 400 }
      );
    }

    // Validate personality IDs
    const validPersonalities = personalities.filter((p: string) =>
      PERSONALITY_IDS.includes(p as PersonalityId)
    ) as PersonalityId[];

    if (validPersonalities.length === 0) {
      return NextResponse.json(
        { error: "No valid personalities selected" },
        { status: 400 }
      );
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY not configured. Add it to your environment variables (or .env.local for local dev).",
        },
        { status: 500 }
      );
    }

    // Use the board state sent from the client
    const safeBoardState =
      boardState && Array.isArray(boardState.shapes)
        ? boardState
        : { shapes: [] };

    // Run all agents in parallel and collect their actions
    const results = await Promise.all(
      validPersonalities.map(async (personality) => {
        const result = await runClaudeAgent({
          prompt: prompt.trim(),
          boardState: safeBoardState,
          personality,
          boardId,
        });

        return {
          personality,
          actions: result.actions,
          reasoning: result.reasoning || null,
          error: result.error || null,
        };
      })
    );

    const totalActions = results.reduce((sum, r) => sum + r.actions.length, 0);
    const errors = results.filter((r) => r.error);

    if (errors.length === results.length) {
      return NextResponse.json(
        {
          error: `All agents failed: ${errors.map((e) => e.error).join("; ")}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      agents: results,
      totalActions,
      message: `${results.length} agent(s) returned ${totalActions} actions`,
    });
  } catch (err) {
    console.error("[Agents Start] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start agents" },
      { status: 500 }
    );
  }
}
