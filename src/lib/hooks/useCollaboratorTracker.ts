"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Editor } from "tldraw";

const DEBOUNCE_MS = 10_000; // 10 seconds

/**
 * Hook to track collaborator edits on a board.
 *
 * Listens to tldraw store changes and debounces API calls
 * to record the current user as a collaborator on the board.
 * Only fires after actual shape changes (not cursor moves).
 */
export function useCollaboratorTracker(
  boardId: string,
  userId: string,
  userName: string,
  userImage: string,
  editorRef: React.RefObject<Editor | null>
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSentRef = useRef(false);

  const updateCollaborator = useCallback(async () => {
    try {
      await fetch(`/api/boards/${boardId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userName, userImage }),
      });
      hasSentRef.current = true;
    } catch (err) {
      console.warn("[Collaborator] Failed to track:", err);
    }
  }, [boardId, userId, userName, userImage]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Listen for store changes (shape creates, updates, deletes)
    const unsub = editor.store.listen(
      () => {
        // Debounce: only send once per 10s of activity
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(updateCollaborator, DEBOUNCE_MS);
      },
      { source: "user", scope: "document" }
    );

    // Also track on first meaningful interaction (immediate, once)
    if (!hasSentRef.current) {
      const firstEditUnsub = editor.store.listen(
        () => {
          updateCollaborator();
          firstEditUnsub();
        },
        { source: "user", scope: "document" }
      );
    }

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editorRef.current, updateCollaborator]);
}
