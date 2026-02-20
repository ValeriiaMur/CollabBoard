/**
 * POST /api/agents/bot-action — External bot action endpoint
 *
 * Allows external bots to add content to a board using an API key.
 * The bot sends structured BoardAction[] and they get written to
 * the Yjs document via server-side writes.
 *
 * Authentication: Bearer token in Authorization header (the API key
 * generated when creating a bot invite).
 *
 * Rate limit: 30 requests/minute per bot (stored in Firestore bot record).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { verifyApiKey } from "@/lib/agents/botAuth";
import { BoardActionSchema } from "@/lib/ai/tools";
import { z } from "zod";

export const runtime = "nodejs";

const BotActionRequestSchema = z.object({
  boardId: z.string().min(1),
  actions: z.array(BoardActionSchema).min(1).max(50),
  botName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // 1. Extract API key from Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Bearer <api_key>" },
      { status: 401 }
    );
  }
  const apiKey = authHeader.slice(7).trim();

  if (!apiKey.startsWith("cb_bot_")) {
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 401 }
    );
  }

  // 2. Parse request body
  let body;
  try {
    body = BotActionRequestSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: err.issues.slice(0, 5),
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { boardId, actions } = body;

  // 3. Verify the API key against stored bots for this board
  try {
    const botsSnap = await db
      .collection("boards")
      .doc(boardId)
      .collection("bots")
      .where("active", "==", true)
      .get();

    let authenticatedBot: {
      id: string;
      name: string;
      rateLimit: number;
    } | null = null;

    for (const doc of botsSnap.docs) {
      const data = doc.data();
      if (verifyApiKey(apiKey, data.apiKeyHash)) {
        authenticatedBot = {
          id: doc.id,
          name: data.name,
          rateLimit: data.rateLimit || 30,
        };
        break;
      }
    }

    if (!authenticatedBot) {
      return NextResponse.json(
        { error: "Invalid API key for this board" },
        { status: 403 }
      );
    }

    // 4. Enforce rate limit (sliding window: requests in last 60s)
    //    Uses single-field filter to avoid needing a composite index.
    const rateLimit = authenticatedBot.rateLimit || 30;

    const recentSnap = await db
      .collection("boards")
      .doc(boardId)
      .collection("pendingBotActions")
      .where("botId", "==", authenticatedBot.id)
      .limit(rateLimit + 1)
      .get();

    const oneMinuteAgo = Date.now() - 60_000;
    const recentCount = recentSnap.docs.filter((d) => {
      const ts = d.data().createdAt;
      if (!ts) return false;
      const millis = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
      return millis >= oneMinuteAgo;
    }).length;

    if (recentCount >= rateLimit) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded: ${rateLimit} requests/minute. Try again shortly.`,
          retryAfterSeconds: 60,
        },
        { status: 429 }
      );
    }

    // 5. Write actions to Firestore as pending (picked up by connected clients)
    const pendingRef = db
      .collection("boards")
      .doc(boardId)
      .collection("pendingBotActions")
      .doc();

    await pendingRef.set({
      botId: authenticatedBot.id,
      botName: authenticatedBot.name,
      actions: JSON.parse(JSON.stringify(actions)), // Serialize for Firestore
      createdAt: FieldValue.serverTimestamp(),
      status: "pending",
    });

    console.log(
      `[Bot Action] ${authenticatedBot.name} submitted ${actions.length} actions for board ${boardId}`
    );

    return NextResponse.json({
      success: true,
      actionsCount: actions.length,
      botName: authenticatedBot.name,
      message: `${actions.length} action(s) queued for board`,
      pendingId: pendingRef.id,
    });
  } catch (err) {
    console.error("[Bot Action] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
