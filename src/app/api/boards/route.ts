import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/boards — Create a new board
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();

  const boardRef = db.collection("boards").doc();
  const now = FieldValue.serverTimestamp();

  const boardData = {
    name: name || "Untitled Board",
    ownerId: session.user.id,
    createdAt: now,
    updatedAt: now,
  };

  await boardRef.set(boardData);

  return NextResponse.json({
    id: boardRef.id,
    name: boardData.name,
    ownerId: boardData.ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// GET /api/boards — List user's boards
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await db
    .collection("boards")
    .where("ownerId", "==", session.user.id)
    .orderBy("updatedAt", "desc")
    .get();

  const boards = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      ownerId: data.ownerId,
      createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
    };
  });

  return NextResponse.json(boards);
}
