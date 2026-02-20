/**
 * Bot Action Listener Hook
 *
 * Polls Firestore for pending bot actions and executes them on the tldraw canvas.
 * External bots POST actions to /api/agents/bot-action, which stores them in
 * Firestore. This hook picks them up and plays them with the agent simulation.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Editor } from "tldraw";
import type { BoardAction } from "../ai/tools";

/** Poll interval in ms */
const POLL_INTERVAL = 3000;

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

  const pollAndExecute = useCallback(async () => {
    if (!editor || processingRef.current) return;
    processingRef.current = true;

    try {
      const res = await fetch(
        `/api/agents/bot-action/poll?boardId=${encodeURIComponent(boardId)}`
      );
      if (!res.ok) return;

      const pending: PendingAction[] = await res.json();

      for (const item of pending) {
        console.log(
          `[BotListener] Executing ${item.actions.length} actions from ${item.botName}`
        );

        for (const action of item.actions) {
          try {
            executeMinimalAction(editor, action);
            await new Promise((r) => setTimeout(r, 200));
          } catch (err) {
            console.warn("[BotListener] Action failed:", err);
          }
        }

        // Mark as completed
        await fetch(`/api/agents/bot-action/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boardId, pendingId: item.id }),
        });
      }
    } catch {
      // Silently ignore poll errors
    } finally {
      processingRef.current = false;
    }
  }, [editor, boardId]);

  useEffect(() => {
    const interval = setInterval(pollAndExecute, POLL_INTERVAL);
    // Also poll immediately on mount
    pollAndExecute();
    return () => clearInterval(interval);
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
      for (const sticky of action.stickies) {
        editor.createShape({
          type: "note",
          x: sticky.position.x,
          y: sticky.position.y,
          props: { text: sticky.text, color: sticky.color || "yellow", size: "m" },
        });
      }
      break;
    default:
      break;
  }
}
