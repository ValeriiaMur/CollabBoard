// DEPRECATED — Liveblocks has been replaced by Yjs + PartyKit.
// Auth is now handled by NextAuth + PartyKit connection.
// This file is no longer used. Safe to delete.
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    { error: "Liveblocks auth endpoint is deprecated. Using PartyKit now." },
    { status: 410 }
  );
}
