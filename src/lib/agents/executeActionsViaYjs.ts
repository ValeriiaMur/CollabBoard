/**
 * Server-Side Board Action Executor (Yjs)
 *
 * Translates BoardAction[] to tldraw TLRecord objects and writes them
 * directly to the Yjs Y.Map. Changes auto-sync to all connected clients.
 *
 * This is the server-side equivalent of /src/lib/ai/executeActions.ts,
 * but writes to Yjs instead of the tldraw editor API.
 */

import * as Y from "yjs";
import type { BoardAction } from "../ai/tools";
import { LAYOUT } from "../ai/constants";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a tldraw-compatible shape ID */
function createShapeId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "shape:";
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/** Convert a geo shape type string to tldraw's geo enum */
const GEO_MAP: Record<string, string> = {
  rectangle: "rectangle",
  ellipse: "ellipse",
  diamond: "diamond",
  star: "star",
};

/**
 * Create a TLRecord object compatible with tldraw's store format.
 * These are the objects written to Y.Map and interpreted by tldraw on clients.
 */
function createTLRecord(
  type: string,
  id: string,
  x: number,
  y: number,
  props: Record<string, unknown>
): Record<string, unknown> {
  return {
    id,
    typeName: "shape",
    type,
    x,
    y,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    parentId: "page:page",
    index: `a${Date.now()}`,
    props,
  };
}

/**
 * Execute a single action by writing TLRecord(s) to the Yjs Y.Map.
 * Returns the IDs of created shapes (for connectors that reference them).
 */
function executeSingleAction(
  yStore: Y.Map<unknown>,
  yDoc: Y.Doc,
  action: BoardAction
): string[] {
  const createdIds: string[] = [];

  switch (action.type) {
    case "create_sticky": {
      const id = createShapeId();
      const record = createTLRecord("note", id, action.position.x, action.position.y, {
        text: action.text,
        color: action.color || "yellow",
        size: "m",
        font: "draw",
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
      });
      yDoc.transact(() => yStore.set(id, record));
      createdIds.push(id);
      break;
    }

    case "create_multiple_stickies": {
      for (const sticky of action.stickies) {
        const id = createShapeId();
        const record = createTLRecord("note", id, sticky.position.x, sticky.position.y, {
          text: sticky.text,
          color: sticky.color || "yellow",
          size: "m",
          font: "draw",
          align: "middle",
          verticalAlign: "middle",
          growY: 0,
          url: "",
        });
        yDoc.transact(() => yStore.set(id, record));
        createdIds.push(id);
      }
      break;
    }

    case "create_text": {
      const id = createShapeId();
      const record = createTLRecord("text", id, action.position.x, action.position.y, {
        text: action.text,
        size: action.size || "m",
        color: "black",
        font: "draw",
        align: "middle",
        autoSize: true,
        w: 300,
        scale: 1,
      });
      yDoc.transact(() => yStore.set(id, record));
      createdIds.push(id);
      break;
    }

    case "create_shape": {
      const id = createShapeId();
      const record = createTLRecord("geo", id, action.position.x, action.position.y, {
        w: action.width || LAYOUT.DEFAULT_SHAPE_SIZE,
        h: action.height || LAYOUT.DEFAULT_SHAPE_SIZE,
        geo: GEO_MAP[action.shapeType] || "rectangle",
        color: action.color || "black",
        text: action.label || "",
        size: "m",
        font: "draw",
        align: "middle",
        verticalAlign: "middle",
        fill: "none",
        dash: "draw",
        labelColor: "black",
        growY: 0,
        url: "",
      });
      yDoc.transact(() => yStore.set(id, record));
      createdIds.push(id);
      break;
    }

    case "create_arrow": {
      const id = createShapeId();
      const record = createTLRecord("arrow", id, action.start.x, action.start.y, {
        start: { x: 0, y: 0 },
        end: {
          x: action.end.x - action.start.x,
          y: action.end.y - action.start.y,
        },
        text: action.label || "",
        color: "black",
        size: "m",
        font: "draw",
        dash: "draw",
        fill: "none",
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
        bend: 0,
        labelPosition: 0.5,
      });
      yDoc.transact(() => yStore.set(id, record));
      createdIds.push(id);
      break;
    }

    case "create_frame": {
      const id = createShapeId();
      const record = createTLRecord("frame", id, action.position.x, action.position.y, {
        w: action.width || LAYOUT.DEFAULT_FRAME_WIDTH,
        h: action.height || LAYOUT.DEFAULT_FRAME_HEIGHT,
        name: action.label || "",
      });
      yDoc.transact(() => yStore.set(id, record));
      createdIds.push(id);
      break;
    }

    case "create_connector": {
      const id = createShapeId();
      const record = createTLRecord("arrow", id, 0, 0, {
        text: action.label || "",
        color: "black",
        size: "m",
        font: "draw",
        dash: "draw",
        fill: "none",
        arrowheadStart: "none",
        arrowheadEnd: action.style === "line" ? "none" : "arrow",
        bend: 0,
        labelPosition: 0.5,
        start: {
          type: "binding",
          boundShapeId: action.fromId,
          normalizedAnchor: { x: 0.5, y: 0.5 },
          isExact: false,
          isPrecise: false,
        },
        end: {
          type: "binding",
          boundShapeId: action.toId,
          normalizedAnchor: { x: 0.5, y: 0.5 },
          isExact: false,
          isPrecise: false,
        },
      });
      yDoc.transact(() => yStore.set(id, record));
      createdIds.push(id);
      break;
    }

    case "summarize_board": {
      const id = createShapeId();
      const record = createTLRecord("note", id, action.position.x, action.position.y, {
        text: `Summary\n\n${action.summary}`,
        color: "light-blue",
        size: "l",
        font: "draw",
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
      });
      yDoc.transact(() => yStore.set(id, record));
      createdIds.push(id);
      break;
    }

    case "move_shapes": {
      yDoc.transact(() => {
        for (const move of action.moves) {
          const existing = yStore.get(move.shapeId) as Record<string, unknown> | undefined;
          if (existing) {
            yStore.set(move.shapeId, {
              ...existing,
              x: move.position.x,
              y: move.position.y,
            });
          }
        }
      });
      break;
    }

    case "resize_object": {
      const existing = yStore.get(action.shapeId) as Record<string, unknown> | undefined;
      if (existing) {
        const props = (existing.props || {}) as Record<string, unknown>;
        yDoc.transact(() => {
          yStore.set(action.shapeId, {
            ...existing,
            props: { ...props, w: action.width, h: action.height },
          });
        });
      }
      break;
    }

    case "update_text": {
      const existing = yStore.get(action.shapeId) as Record<string, unknown> | undefined;
      if (existing) {
        const props = (existing.props || {}) as Record<string, unknown>;
        yDoc.transact(() => {
          yStore.set(action.shapeId, {
            ...existing,
            props: { ...props, text: action.newText },
          });
        });
      }
      break;
    }

    case "change_color": {
      const existing = yStore.get(action.shapeId) as Record<string, unknown> | undefined;
      if (existing) {
        const props = (existing.props || {}) as Record<string, unknown>;
        yDoc.transact(() => {
          yStore.set(action.shapeId, {
            ...existing,
            props: { ...props, color: action.color },
          });
        });
      }
      break;
    }

    case "group_items": {
      for (const group of action.groups) {
        const frameId = createShapeId();
        const frameRecord = createTLRecord(
          "frame",
          frameId,
          group.framePosition.x,
          group.framePosition.y,
          {
            w: group.frameWidth || LAYOUT.DEFAULT_GROUP_FRAME_WIDTH,
            h: group.frameHeight || LAYOUT.DEFAULT_GROUP_FRAME_HEIGHT,
            name: group.label,
          }
        );
        yDoc.transact(() => yStore.set(frameId, frameRecord));
        createdIds.push(frameId);

        // Move items into the frame area
        let offsetX = LAYOUT.FRAME_PADDING_X;
        let offsetY = LAYOUT.FRAME_HEADER_HEIGHT;
        let col = 0;
        const maxCols = Math.floor(
          (group.frameWidth || LAYOUT.DEFAULT_GROUP_FRAME_WIDTH) / LAYOUT.STICKY_SPACING
        );

        yDoc.transact(() => {
          for (const shapeId of group.shapeIds) {
            const existing = yStore.get(shapeId) as Record<string, unknown> | undefined;
            if (existing) {
              yStore.set(shapeId, {
                ...existing,
                x: group.framePosition.x + offsetX,
                y: group.framePosition.y + offsetY,
              });
              col++;
              if (col >= maxCols) {
                col = 0;
                offsetX = LAYOUT.FRAME_PADDING_X;
                offsetY += LAYOUT.STICKY_SPACING;
              } else {
                offsetX += LAYOUT.STICKY_SPACING;
              }
            }
          }
        });
      }
      break;
    }
  }

  return createdIds;
}

/**
 * Execute an array of board actions via Yjs writes.
 * Staggers writes with delays for visual effect on connected clients.
 */
export async function executeActionsViaYjs(
  yStore: Y.Map<unknown>,
  yDoc: Y.Doc,
  actions: BoardAction[],
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  let completed = 0;

  for (const action of actions) {
    try {
      if (action.type === "create_multiple_stickies") {
        // Animate each sticky individually
        for (const sticky of action.stickies) {
          executeSingleAction(yStore, yDoc, {
            type: "create_sticky",
            text: sticky.text,
            position: sticky.position,
            color: sticky.color || "yellow",
          });
          await sleep(LAYOUT.ANIMATION_DELAY);
          onProgress?.(++completed, actions.length);
        }
      } else {
        executeSingleAction(yStore, yDoc, action);
        completed++;
        onProgress?.(completed, actions.length);
        await sleep(LAYOUT.ANIMATION_DELAY);
      }
    } catch (error) {
      console.error("[executeActionsViaYjs] Failed:", action.type, error);
    }
  }

  return completed;
}

/**
 * Read current board state from the Yjs Y.Map.
 * Returns the same BoardState format used by the AI agents.
 */
export function readBoardStateFromYjs(yStore: Y.Map<unknown>) {
  const shapes: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    props: Record<string, unknown>;
  }> = [];

  yStore.forEach((value, key) => {
    const record = value as Record<string, unknown>;
    if (record.typeName === "shape") {
      shapes.push({
        id: key,
        type: record.type as string,
        x: Math.round(record.x as number),
        y: Math.round(record.y as number),
        props: (record.props || {}) as Record<string, unknown>,
      });
    }
  });

  return { shapes };
}
