import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

/** Max boards per page for pagination */
const PAGE_SIZE = 50;

// POST /api/boards — Create a new board
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
  } catch (error) {
    console.error("[/api/boards] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 }
    );
  }
}

// GET /api/boards — List user's boards (paginated + cached)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10),
      100
    );
    const cursor = searchParams.get("cursor"); // last doc ID for pagination

    let query = db
      .collection("boards")
      .where("ownerId", "==", session.user.id)
      .orderBy("updatedAt", "desc")
      .limit(limit);

    // Pagination: start after the cursor document
    if (cursor) {
      const cursorDoc = await db.collection("boards").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();

    const boards = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Convert collaborators map to sorted array
      const collaboratorsMap = data.collaborators || {};
      const collaborators = Object.entries(collaboratorsMap)
        .map(([uid, collab]: [string, any]) => ({
          userId: uid,
          userName: collab.userName,
          userImage: collab.userImage || null,
          editedAt: collab.editedAt?.toDate?.().toISOString() ?? null,
        }))
        .sort(
          (a, b) =>
            new Date(b.editedAt ?? 0).getTime() -
            new Date(a.editedAt ?? 0).getTime()
        );

      return {
        id: doc.id,
        name: data.name,
        ownerId: data.ownerId,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
        thumbnailDataUrl: data.thumbnailDataUrl || null,
        collaborators,
      };
    });

    // Build pagination info
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === limit;

    const response = NextResponse.json({
      boards,
      nextCursor: hasMore && lastDoc ? lastDoc.id : null,
      hasMore,
    });

    // Cache for 10 seconds on CDN, 0 on browser (stale-while-revalidate for 60s)
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=10, stale-while-revalidate=60"
    );

    return response;
  } catch (error) {
    console.error("[/api/boards] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch boards" },
      { status: 500 }
    );
  }
}
