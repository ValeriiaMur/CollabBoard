/**
 * Bot Action Poll Endpoint
 *
 * GET  — Atomically claim & fetch pending bot actions for a board.
 *        Uses a Firestore transaction to set status="processing" + claimedBy
 *        so that only one client processes each action (prevents duplicates).
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

  const clientId = session.user.id || session.user.email || "unknown";

  try {
    const collectionRef = db
      .collection("boards")
      .doc(boardId)
      .collection("pendingBotActions");

    // Query pending items — uses only equality filter (no composite index needed)
    const snap = await collectionRef
      .where("status", "==", "pending")
      .limit(5)
      .get();

    if (snap.empty) {
      return NextResponse.json([]);
    }

    // Atomically claim each doc inside a transaction so only one client gets it
    const claimed: { id: string; botName: string; actions: unknown[] }[] = [];

    for (const docSnap of snap.docs) {
      try {
        await db.runTransaction(async (tx) => {
          const freshDoc = await tx.get(collectionRef.doc(docSnap.id));
          if (!freshDoc.exists || freshDoc.data()?.status !== "pending") {
            // Another client already claimed it — skip
            return;
          }
          tx.update(collectionRef.doc(docSnap.id), {
            status: "processing",
            claimedBy: clientId,
            claimedAt: new Date(),
          });
          claimed.push({
            id: docSnap.id,
            botName: freshDoc.data()?.botName || "Bot",
            actions: freshDoc.data()?.actions || [],
          });
        });
      } catch {
        // Transaction contention — another client won, skip this doc
      }
    }

    return NextResponse.json(claimed);
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
