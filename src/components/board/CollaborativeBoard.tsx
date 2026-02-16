"use client";

import { useCallback, useEffect } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useYjsStore } from "@/lib/useYjsStore";
import { useAwareness } from "@/lib/useAwareness";
import { AwarenessProvider } from "@/lib/AwarenessContext";
import { LiveCursors } from "./LiveCursors";
import { PresenceAvatars } from "./PresenceAvatars";

interface CollaborativeBoardProps {
  boardId: string;
  userName: string;
  userColor: string;
  userImage: string;
  partyHost: string;
}

/**
 * The main collaborative whiteboard component.
 * Renders tldraw with PartyKit Yjs sync for real-time collaboration.
 *
 * MVP features provided:
 * - Infinite board with pan/zoom (tldraw)
 * - Sticky notes with editable text (tldraw note tool)
 * - Shapes: rectangles, circles, lines, arrows (tldraw)
 * - Create, move, edit objects (tldraw)
 * - Real-time sync (Yjs + PartyKit WebSocket)
 * - Multiplayer cursors with name labels (Yjs awareness → LiveCursors)
 * - Presence awareness (Yjs awareness → PresenceAvatars)
 */
export function CollaborativeBoard({
  boardId,
  userName,
  userColor,
  userImage,
  partyHost,
}: CollaborativeBoardProps) {
  const roomId = `board-${boardId}`;
  const { storeWithStatus, provider } = useYjsStore({
    roomId,
    hostUrl: partyHost,
  });

  const { others, self, setLocalState, setCursor } = useAwareness(provider);

  // Initialize awareness with user info
  useEffect(() => {
    setLocalState({
      name: userName,
      color: userColor,
      image: userImage,
      cursor: null,
    });
  }, [setLocalState, userName, userColor, userImage]);

  // Track cursor position on the tldraw canvas and broadcast via awareness
  const handleMount = useCallback(
    (editor: Editor) => {
      editor.on("event", (event) => {
        if (event.name === "pointer_move") {
          const pagePoint = editor.inputs.currentPagePoint;
          if (pagePoint) {
            setCursor({ x: pagePoint.x, y: pagePoint.y });
          }
        }
      });

      // Clear cursor when tab loses focus
      const handleBlur = () => setCursor(null);
      window.addEventListener("blur", handleBlur);

      return () => {
        window.removeEventListener("blur", handleBlur);
      };
    },
    [setCursor]
  );

  if (storeWithStatus.status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Connecting to board...</p>
        </div>
      </div>
    );
  }

  if (storeWithStatus.status === "error") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-center text-red-500">
          <p className="text-lg font-semibold">Connection Error</p>
          <p className="mt-1 text-sm">
            Failed to connect to the board. Please refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AwarenessProvider value={{ others, self, setCursor }}>
      <div className="relative h-screen w-screen">
        {/* Presence: who's online — top-right overlay */}
        <div className="absolute right-4 top-4 z-50">
          <PresenceAvatars />
        </div>

        {/* Board name — top-left overlay */}
        <div className="absolute left-16 top-4 z-50">
          <span className="rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm">
            {boardId}
          </span>
        </div>

        {/* tldraw canvas with PartyKit-synced store */}
        <Tldraw
          store={storeWithStatus}
          onMount={handleMount}
          components={{
            InFrontOfTheCanvas: LiveCursors,
          }}
        />
      </div>
    </AwarenessProvider>
  );
}
