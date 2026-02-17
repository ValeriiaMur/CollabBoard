"use client";

import dynamic from "next/dynamic";

/**
 * Dynamically import CollaborativeBoard with SSR disabled.
 * tldraw uses React hooks and browser APIs that break during
 * Next.js server-side rendering — this ensures it only runs in the browser.
 */
const CollaborativeBoard = dynamic(
  () =>
    import("@/components/board/CollaborativeBoard").then(
      (mod) => mod.CollaborativeBoard
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading board...</p>
        </div>
      </div>
    ),
  }
);

interface BoardRoomProps {
  boardId: string;
  userName: string;
  userColor: string;
  userImage: string;
  partyHost: string;
}

export function BoardRoom({
  boardId,
  userName,
  userColor,
  userImage,
  partyHost,
}: BoardRoomProps) {
  return (
    <CollaborativeBoard
      boardId={boardId}
      userName={userName}
      userColor={userColor}
      userImage={userImage}
      partyHost={partyHost}
    />
  );
}
