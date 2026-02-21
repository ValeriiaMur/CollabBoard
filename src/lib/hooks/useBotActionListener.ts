/**
 * Bot Action Listener Hook
 *
 * Polls Firestore for pending bot actions and executes them on the tldraw canvas.
 * External bots POST actions to /api/agents/bot-action, which stores them in
 * Firestore. This hook picks them up and plays them with the agent simulation.
 *
 * Performance & reliability improvements:
 *   - AbortController cancels in-flight requests on unmount
 *   - Max retry limit (10) prevents infinite polling on persistent errors
 *   - Batched action execution via editor.batch() instead of sequential
 *   - Reduced per-action delay (80ms vs 200ms)
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Editor } from "tldraw";
import type { BoardAction } from "../ai/tools";

/** Base poll interval in ms */
const POLL_INTERVAL = 3000;
/** Max backoff interval after consecutive errors */
const MAX_BACKOFF = 60_000;
/** Max consecutive errors before stopping polling */
const MAX_RETRIES = 10;
/** Delay between individual actions within a batch (ms) */
const ACTION_DELAY = 80;

interface PendingAction {
  id: string;
  botName: string;
  actions: BoardAction[];
}

export function useBotActionListener(
  editor: Editor | null,
  boardId: string
) {
  const processingRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const pollAndExecute = useCallback(async () => {
    if (!editor || processingRef.current) return;
    if (consecutiveErrorsRef.current >= MAX_RETRIES) {
      console.warn("[BotListener] Max retries reached, stopping poll");
      return;
    }

    processingRef.current = true;

    // Create abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(
        `/api/agents/bot-action/poll?boardId=${encodeURIComponent(boardId)}`,
        { signal: controller.signal }
      );

      if (!res.ok) {
        consecutiveErrorsRef.current++;
        return;
      }

      const pending: PendingAction[] = await res.json();

      // Reset backoff on successful poll (even if no items)
      consecutiveErrorsRef.current = 0;

      for (const item of pending) {
        console.log(
          `[BotListener] Executing ${item.actions.length} actions from ${item.botName}`
        );

        // Batch simple create actions together for speed
        const simpleCreates: BoardAction[] = [];
        const otherActions: BoardAction[] = [];

        for (const action of item.actions) {
          if (
            action.type === "create_sticky" ||
            action.type === "create_text" ||
            action.type === "create_frame"
          ) {
            simpleCreates.push(action);
          } else {
            otherActions.push(action);
          }
        }

        // Execute simple creates in one batch
        if (simpleCreates.length > 0) {
          editor.batch(() => {
            for (const action of simpleCreates) {
              executeMinimalAction(editor, action);
            }
          });
        }

        // Execute remaining actions with minimal delay
        for (const action of otherActions) {
          try {
            executeMinimalAction(editor, action);
            await new Promise((r) => setTimeout(r, ACTION_DELAY));
          } catch (err) {
            console.warn("[BotListener] Action failed:", err);
          }
        }

        // Mark as completed (don't abort this — we want it to complete)
        await fetch(`/api/agents/bot-action/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boardId, pendingId: item.id }),
        }).catch(() => {
          // Non-critical — action already executed on canvas
          console.warn("[BotListener] Failed to mark action as completed");
        });
      }
    } catch (err) {
      // Ignore abort errors (expected on unmount)
      if (err instanceof DOMException && err.name === "AbortError") return;

      consecutiveErrorsRef.current++;
      if (consecutiveErrorsRef.current <= 2) {
        console.warn("[BotListener] Poll failed, will back off");
      }
    } finally {
      processingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [editor, boardId]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let stopped = false;

    const scheduleNext = () => {
      if (stopped) return;
      if (consecutiveErrorsRef.current >= MAX_RETRIES) return;

      // Exponential backoff: 3s → 6s → 12s → 24s → 48s → 60s (cap)
      const errors = consecutiveErrorsRef.current;
      const delay = errors === 0
        ? POLL_INTERVAL
        : Math.min(POLL_INTERVAL * Math.pow(2, errors), MAX_BACKOFF);

      timeoutId = setTimeout(async () => {
        await pollAndExecute();
        scheduleNext();
      }, delay);
    };

    // Poll immediately on mount, then schedule
    pollAndExecute().then(scheduleNext);

    return () => {
      stopped = true;
      clearTimeout(timeoutId);
      // Abort any in-flight fetch
      abortControllerRef.current?.abort();
    };
  }, [pollAndExecute]);
}

/** Execute a single action with minimal props (matches tldraw 2.4 schema) */
function executeMinimalAction(editor: Editor, action: BoardAction) {
  switch (action.type) {
    case "create_sticky":
      editor.createShape({
        type: "note",
        x: action.position.x,
        y: action.position.y,
        props: { text: action.text, color: action.color || "yellow", size: "m" },
      });
      break;
    case "create_text":
      editor.createShape({
        type: "text",
        x: action.position.x,
        y: action.position.y,
        props: { text: action.text, size: action.size || "m", color: "black" },
      });
      break;
    case "create_shape":
      editor.createShape({
        type: "geo",
        x: action.position.x,
        y: action.position.y,
        props: {
          w: action.width || 200,
          h: action.height || 200,
          geo: action.shapeType || "rectangle",
          color: action.color || "black",
          text: action.label || "",
        },
      });
      break;
    case "create_frame":
      editor.createShape({
        type: "frame",
        x: action.position.x,
        y: action.position.y,
        props: { w: action.width || 600, h: action.height || 400, name: action.label || "" },
      });
      break;
    case "create_arrow":
      editor.createShape({
        type: "arrow",
        x: action.start.x,
        y: action.start.y,
        props: {
          start: { x: 0, y: 0 },
          end: { x: action.end.x - action.start.x, y: action.end.y - action.start.y },
          text: action.label || "",
          color: "black",
        },
      });
      break;
    case "create_multiple_stickies":
      editor.batch(() => {
        for (const sticky of action.stickies) {
          editor.createShape({
            type: "note",
            x: sticky.position.x,
            y: sticky.position.y,
            props: { text: sticky.text, color: sticky.color || "yellow", size: "m" },
          });
        }
      });
      break;
    default:
      break;
  }
}
