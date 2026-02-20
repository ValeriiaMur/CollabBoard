/**
 * Bot CRUD API
 *
 * POST /api/agents/bots — Create a new bot invite (generates API key)
 * GET /api/agents/bots?boardId=x — List bots for a board
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { generateBotApiKey, hashApiKey } from "@/lib/agents/botAuth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { boardId, name } = await req.json();

    if (!boardId || !name) {
      return NextResponse.json(
        { error: "Missing boardId or name" },
        { status: 400 }
      );
    }

    // Verify board ownership
    const boardRef = db.collection("boards").doc(boardId);
    const boardSnap = await boardRef.get();
    if (!boardSnap.exists) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    if (boardSnap.data()?.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only board owners can create bot invites" },
        { status: 403 }
      );
    }

    // Generate API key
    const apiKey = generateBotApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    // Store bot record
    const botRef = db
      .collection("boards")
      .doc(boardId)
      .collection("bots")
      .doc();

    await botRef.set({
      name,
      apiKeyHash,
      createdBy: session.user.id,
      createdAt: FieldValue.serverTimestamp(),
      rateLimit: 30, // requests per minute
      active: true,
    });

    // Return the API key (shown once, never stored in plain text)
    return NextResponse.json({
      botId: botRef.id,
      name,
      apiKey, // Only returned on creation!
      boardId,
      message: "Save this API key — it won't be shown again.",
    });
  } catch (err) {
    console.error("[Bot API] Create error:", err);
    return NextResponse.json(
      { error: "Failed to create bot" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boardId = req.nextUrl.searchParams.get("boardId");
  if (!boardId) {
    return NextResponse.json(
      { error: "Missing boardId query param" },
      { status: 400 }
    );
  }

  try {
    const botsSnap = await db
      .collection("boards")
      .doc(boardId)
      .collection("bots")
      .where("active", "==", true)
      .get();

    const bots = botsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        botId: doc.id,
        name: data.name,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        createdBy: data.createdBy,
        rateLimit: data.rateLimit,
        active: data.active,
      };
    });

    return NextResponse.json(bots);
  } catch (err) {
    console.error("[Bot API] List error:", err);
    return NextResponse.json(
      { error: "Failed to list bots" },
      { status: 500 }
    );
  }
}
