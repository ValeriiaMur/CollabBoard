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
 *
 * Fixes:
 *   - Single listener (no more double-tracking on first edit)
 *   - AbortController cancels in-flight request on unmount
 *   - hasSentRef prevents redundant immediate calls
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateCollaborator = useCallback(async () => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await fetch(`/api/boards/${boardId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userName, userImage }),
        signal: controller.signal,
      });
      hasSentRef.current = true;
    } catch (err) {
      // Ignore abort errors (expected on unmount or dedup)
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.warn("[Collaborator] Failed to track:", err);
    }
  }, [boardId, userId, userName, userImage]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Single listener handles both immediate-first and debounced-subsequent
    const unsub = editor.store.listen(
      () => {
        // First edit: send immediately (once)
        if (!hasSentRef.current) {
          updateCollaborator();
          // Don't return — also start the debounce timer for subsequent edits
        }

        // Debounce subsequent edits
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(updateCollaborator, DEBOUNCE_MS);
      },
      { source: "user", scope: "document" }
    );

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortControllerRef.current?.abort();
    };
    // editorRef is a ref — stable across renders, so we use .current safely
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef.current, updateCollaborator]);
}
