/**
 * Bot Action Poll Endpoint
 *
 * GET  — Fetch pending bot actions for a board (called by client-side listener)
 * POST — Mark a pending action as completed
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boardId = req.nextUrl.searchParams.get("boardId");
  if (!boardId) {
    return NextResponse.json({ error: "Missing boardId" }, { status: 400 });
  }

  try {
    const snap = await db
      .collection("boards")
      .doc(boardId)
      .collection("pendingBotActions")
      .where("status", "==", "pending")
      .orderBy("createdAt", "asc")
      .limit(5)
      .get();

    const pending = snap.docs.map((doc) => ({
      id: doc.id,
      botName: doc.data().botName || "Bot",
      actions: doc.data().actions || [],
    }));

    return NextResponse.json(pending);
  } catch (err) {
    console.error("[Bot Poll] Error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { boardId, pendingId } = await req.json();

    if (!boardId || !pendingId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    await db
      .collection("boards")
      .doc(boardId)
      .collection("pendingBotActions")
      .doc(pendingId)
      .update({ status: "completed" });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Bot Poll] Mark complete error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
