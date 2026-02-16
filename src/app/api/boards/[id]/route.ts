import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

// DELETE /api/boards/[id] — Delete a board
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const boardRef = db.collection("boards").doc(params.id);
  const boardSnap = await boardRef.get();

  if (!boardSnap.exists || boardSnap.data()?.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await boardRef.delete();

  return NextResponse.json({ success: true });
}

// PATCH /api/boards/[id] — Update board name
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();

  const boardRef = db.collection("boards").doc(params.id);
  const boardSnap = await boardRef.get();

  if (!boardSnap.exists || boardSnap.data()?.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await boardRef.update({
    name,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedSnap = await boardRef.get();
  const data = updatedSnap.data()!;

  return NextResponse.json({
    id: updatedSnap.id,
    name: data.name,
    ownerId: data.ownerId,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
  });
}
