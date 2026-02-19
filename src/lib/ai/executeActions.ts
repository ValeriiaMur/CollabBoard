/**
 * Board Action Executor
 *
 * Translates structured AI actions into tldraw editor API calls.
 * This runs on the client — each action creates/moves shapes via tldraw,
 * which automatically syncs to all users via Yjs.
 *
 * Each action is executed with a small delay for visual feedback
 * (so users can see items appearing one by one).
 */

import {
  type Editor,
  createShapeId,
  type TLShapeId,
} from "tldraw";
import type { BoardAction } from "./tools";
import { LAYOUT } from "./constants";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a single board action against the tldraw editor.
 */
function executeSingleAction(editor: Editor, action: BoardAction): void {
  switch (action.type) {
    case "create_sticky": {
      const id = createShapeId();
      editor.createShape({
        id,
        type: "note",
        x: action.position.x,
        y: action.position.y,
        props: {
          text: action.text,
          color: action.color || "yellow",
          size: "m",
        },
      });
      break;
    }

    case "create_multiple_stickies": {
      for (const sticky of action.stickies) {
        const id = createShapeId();
        editor.createShape({
          id,
          type: "note",
          x: sticky.position.x,
          y: sticky.position.y,
          props: {
            text: sticky.text,
            color: sticky.color || "yellow",
            size: "m",
          },
        });
      }
      break;
    }

    case "create_text": {
      const id = createShapeId();
      editor.createShape({
        id,
        type: "text",
        x: action.position.x,
        y: action.position.y,
        props: {
          text: action.text,
          size: action.size || "m",
          color: "black",
        },
      });
      break;
    }

    case "create_shape": {
      const id = createShapeId();
      const geoMap: Record<string, string> = {
        rectangle: "rectangle",
        ellipse: "ellipse",
        diamond: "diamond",
        star: "star",
      };

      editor.createShape({
        id,
        type: "geo",
        x: action.position.x,
        y: action.position.y,
        props: {
          w: action.width || LAYOUT.DEFAULT_SHAPE_SIZE,
          h: action.height || LAYOUT.DEFAULT_SHAPE_SIZE,
          geo: geoMap[action.shapeType] || "rectangle",
          color: action.color || "black",
          text: action.label || "",
        },
      });
      break;
    }

    case "create_arrow": {
      const id = createShapeId();
      editor.createShape({
        id,
        type: "arrow",
        x: action.start.x,
        y: action.start.y,
        props: {
          start: { x: 0, y: 0 },
          end: {
            x: action.end.x - action.start.x,
            y: action.end.y - action.start.y,
          },
          text: action.label || "",
          color: "black",
        },
      });
      break;
    }

    case "create_frame": {
      const id = createShapeId();
      editor.createShape({
        id,
        type: "frame",
        x: action.position.x,
        y: action.position.y,
        props: {
          w: action.width || LAYOUT.DEFAULT_FRAME_WIDTH,
          h: action.height || LAYOUT.DEFAULT_FRAME_HEIGHT,
          name: action.label || "",
        },
      });
      break;
    }

    case "move_shapes": {
      for (const move of action.moves) {
        try {
          editor.updateShape({
            id: move.shapeId as TLShapeId,
            type: "geo", // type is required but won't change the actual type
            x: move.position.x,
            y: move.position.y,
          });
        } catch (e) {
          console.warn(`[executeAction] Could not move shape ${move.shapeId}:`, e);
        }
      }
      break;
    }

    case "summarize_board": {
      const id = createShapeId();
      editor.createShape({
        id,
        type: "note",
        x: action.position.x,
        y: action.position.y,
        props: {
          text: `📋 Summary\n\n${action.summary}`,
          color: "light-blue",
          size: "l",
        },
      });
      break;
    }

    case "create_connector": {
      // Create an arrow bound between two existing shapes by ID
      const id = createShapeId();
      editor.createShape({
        id,
        type: "arrow",
        props: {
          text: action.label || "",
          color: "black",
          arrowheadEnd: action.style === "line" ? "none" : "arrow",
          start: {
            type: "binding",
            boundShapeId: action.fromId as TLShapeId,
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false,
            isPrecise: false,
          },
          end: {
            type: "binding",
            boundShapeId: action.toId as TLShapeId,
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false,
            isPrecise: false,
          },
        },
      });
      break;
    }

    case "resize_object": {
      try {
        const shape = editor.getShape(action.shapeId as TLShapeId);
        if (shape) {
          editor.updateShape({
            id: action.shapeId as TLShapeId,
            type: shape.type,
            props:
              shape.type === "frame" || shape.type === "geo"
                ? { w: action.width, h: action.height }
                : {},
          });
        }
      } catch (e) {
        console.warn(`[executeAction] Could not resize shape ${action.shapeId}:`, e);
      }
      break;
    }

    case "update_text": {
      try {
        const shape = editor.getShape(action.shapeId as TLShapeId);
        if (shape) {
          editor.updateShape({
            id: action.shapeId as TLShapeId,
            type: shape.type,
            props: {
              text: action.newText,
            },
          });
        }
      } catch (e) {
        console.warn(`[executeAction] Could not update text on ${action.shapeId}:`, e);
      }
      break;
    }

    case "change_color": {
      try {
        const shape = editor.getShape(action.shapeId as TLShapeId);
        if (shape) {
          editor.updateShape({
            id: action.shapeId as TLShapeId,
            type: shape.type,
            props: {
              color: action.color,
            },
          });
        }
      } catch (e) {
        console.warn(`[executeAction] Could not change color of ${action.shapeId}:`, e);
      }
      break;
    }

    case "group_items": {
      for (const group of action.groups) {
        // Create a frame for each group
        const frameId = createShapeId();
        editor.createShape({
          id: frameId,
          type: "frame",
          x: group.framePosition.x,
          y: group.framePosition.y,
          props: {
            w: group.frameWidth || LAYOUT.DEFAULT_GROUP_FRAME_WIDTH,
            h: group.frameHeight || LAYOUT.DEFAULT_GROUP_FRAME_HEIGHT,
            name: group.label,
          },
        });

        // Move items into the frame area
        // (We offset them inside the frame bounds)
        let offsetX = LAYOUT.FRAME_PADDING_X;
        let offsetY = LAYOUT.FRAME_HEADER_HEIGHT;
        const colWidth = LAYOUT.STICKY_SPACING;
        const rowHeight = LAYOUT.STICKY_SPACING;
        let col = 0;
        const maxCols = Math.floor(
          (group.frameWidth || LAYOUT.DEFAULT_GROUP_FRAME_WIDTH) / colWidth
        );

        for (const shapeId of group.shapeIds) {
          try {
            editor.updateShape({
              id: shapeId as TLShapeId,
              type: "note",
              x: group.framePosition.x + offsetX,
              y: group.framePosition.y + offsetY,
            });
            col++;
            if (col >= maxCols) {
              col = 0;
              offsetX = LAYOUT.FRAME_PADDING_X;
              offsetY += rowHeight;
            } else {
              offsetX += colWidth;
            }
          } catch (e) {
            console.warn(`[executeAction] Could not move shape ${shapeId} into group:`, e);
          }
        }
      }
      break;
    }
  }
}

/**
 * Execute an array of board actions with animated delays.
 * Returns the count of successfully executed actions.
 */
export async function executeActions(
  editor: Editor,
  actions: BoardAction[],
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  let completed = 0;

  for (const action of actions) {
    try {
      // For create_multiple_stickies, animate each sticky individually
      if (action.type === "create_multiple_stickies") {
        for (const sticky of action.stickies) {
          executeSingleAction(editor, {
            type: "create_sticky",
            text: sticky.text,
            position: sticky.position,
            color: sticky.color || "yellow",
          });
          await sleep(LAYOUT.ANIMATION_DELAY);
          onProgress?.(++completed, actions.length);
        }
      } else {
        executeSingleAction(editor, action);
        completed++;
        onProgress?.(completed, actions.length);
        await sleep(LAYOUT.ANIMATION_DELAY);
      }
    } catch (error) {
      console.error("[executeActions] Failed to execute action:", action.type, error);
    }
  }

  return completed;
}

/**
 * Serialize the current board state for sending to the AI agent.
 * Extracts shape data that the LLM needs for context-aware responses.
 */
export function serializeBoardState(editor: Editor) {
  const shapes = editor.getCurrentPageShapes();

  return {
    shapes: shapes.map((shape) => ({
      id: shape.id,
      type: shape.type,
      x: Math.round(shape.x),
      y: Math.round(shape.y),
      props: shape.props,
    })),
  };
}
