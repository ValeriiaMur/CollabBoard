"use client";

import { CollaborativeBoard } from "@/components/board/CollaborativeBoard";

interface BoardRoomProps {
  boardId: string;
  userName: string;
  userColor: string;
  userImage: string;
  partyHost: string;
}

/**
 * Client component that renders the collaborative board.
 * No external provider wrapper needed — PartyKit connection is
 * established inside CollaborativeBoard via useYjsStore hook.
 */
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
