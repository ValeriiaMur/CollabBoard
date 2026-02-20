import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/boards/[id]/collaborators — Track a collaborator edit
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, userName, userImage } = await req.json();

    if (!userId || !userName) {
      return NextResponse.json(
        { error: "Missing userId or userName" },
        { status: 400 }
      );
    }

    const boardRef = db.collection("boards").doc(params.id);
    const boardSnap = await boardRef.get();

    if (!boardSnap.exists) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Use dot notation to update a single collaborator entry
    // without overwriting the entire collaborators map
    await boardRef.update({
      [`collaborators.${userId}`]: {
        userName,
        userImage: userImage || null,
        editedAt: FieldValue.serverTimestamp(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Collaborators API] Error:", err);
    return NextResponse.json(
      { error: "Failed to track collaborator" },
      { status: 500 }
    );
  }
}
