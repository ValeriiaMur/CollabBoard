"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useYjsStore } from "@/lib/useYjsStore";
import { useAwareness } from "@/lib/useAwareness";
import { AwarenessProvider } from "@/lib/AwarenessContext";
import { useSnapshotCapture } from "@/lib/hooks/useSnapshotCapture";
import { useCollaboratorTracker } from "@/lib/hooks/useCollaboratorTracker";
import { LiveCursors } from "./LiveCursors";
import { PresenceAvatars } from "./PresenceAvatars";
import { BoardHeader } from "./BoardHeader";
import { CommandBar } from "./CommandBar";
import { AiActivityIndicator } from "./AiActivityIndicator";

interface CollaborativeBoardProps {
  boardId: string;
  userId: string;
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
 * - AI Board Agent (CommandBar → /api/ai/command → tldraw editor)
 */
export function CollaborativeBoard({
  boardId,
  userId,
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

  // Store editor reference for CommandBar to use
  const editorRef = useRef<Editor | null>(null);

  // Board thumbnail capture (periodic + on exit)
  const { captureAndSave } = useSnapshotCapture(editorRef, boardId);

  // Collaborator tracking (debounced on edits)
  useCollaboratorTracker(boardId, userId, userName, userImage, editorRef);

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
      // Store the editor reference for AI command execution
      editorRef.current = editor;

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

      // Capture initial snapshot after a short delay (let content load)
      setTimeout(() => captureAndSave(), 3000);

      return () => {
        window.removeEventListener("blur", handleBlur);
      };
    },
    [setCursor, captureAndSave]
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
        <div className="text-center max-w-md">
          <p className="text-lg font-semibold text-red-500">Connection Error</p>
          <p className="mt-2 text-sm text-gray-600">
            Could not connect to the PartyKit sync server.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Make sure PartyKit is running:{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-600">
              npx partykit dev
            </code>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <AwarenessProvider value={{ others, self, setCursor, setLocalState }}>
      <div className="flex h-screen w-screen flex-col">
        {/* Board header with nav, share, sign out */}
        <BoardHeader
          boardId={boardId}
          userName={userName}
          userImage={userImage}
        />

        {/* Canvas area — fills remaining height */}
        <div className="relative flex-1">
          {/* Presence: who's online — top-right of canvas */}
          <div className="absolute right-4 top-2 z-50">
            <PresenceAvatars />
          </div>

          {/* tldraw canvas with PartyKit-synced store */}
          <Tldraw
            store={storeWithStatus}
            onMount={handleMount}
            components={{
              InFrontOfTheCanvas: LiveCursors,
            }}
          />

          {/* AI activity broadcast — sparkle indicator for all users */}
          <AiActivityIndicator />

          {/* AI Agent Command Bar */}
          <CommandBar editor={editorRef.current} boardId={boardId} />
        </div>
      </div>
    </AwarenessProvider>
  );
}
