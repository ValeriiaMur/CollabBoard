import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/boards/[id]/snapshot — Save board thumbnail
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { thumbnailDataUrl } = await req.json();

    if (!thumbnailDataUrl || typeof thumbnailDataUrl !== "string") {
      return NextResponse.json(
        { error: "Missing thumbnailDataUrl" },
        { status: 400 }
      );
    }

    // Enforce size limit (~100KB base64 string)
    if (thumbnailDataUrl.length > 100_000) {
      return NextResponse.json(
        { error: "Thumbnail too large" },
        { status: 413 }
      );
    }

    // Validate mime type — only allow safe image formats
    if (
      !thumbnailDataUrl.startsWith("data:image/png") &&
      !thumbnailDataUrl.startsWith("data:image/jpeg") &&
      !thumbnailDataUrl.startsWith("data:image/webp")
    ) {
      return NextResponse.json(
        { error: "Invalid thumbnail format. Only PNG, JPEG, and WebP are allowed." },
        { status: 400 }
      );
    }

    const boardRef = db.collection("boards").doc(params.id);
    const boardSnap = await boardRef.get();

    if (!boardSnap.exists) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Verify board ownership
    const boardData = boardSnap.data();
    if (boardData?.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await boardRef.update({
      thumbnailDataUrl,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Snapshot API] Error:", err);
    return NextResponse.json(
      { error: "Failed to save snapshot" },
      { status: 500 }
    );
  }
}
