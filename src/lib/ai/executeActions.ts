/**
 * Board Action Executor
 *
 * Translates structured AI actions into tldraw editor API calls.
 * This runs on the client — each action creates/moves shapes via tldraw,
 * which automatically syncs to all users via Yjs.
 *
 * Performance optimizations:
 *   - editor.batch() wraps compound operations in a single Yjs transaction
 *   - Compound tools (create_layout, create_flowchart, bulk_create, create_template)
 *     execute all shapes in one batch with minimal delay
 *   - Animation delays only between top-level actions, not within compounds
 *   - Compact board state serialization reduces token usage by ~60%
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

// ─── Template definitions for create_template ────────────────
const TEMPLATE_DEFS: Record<
  string,
  (topic?: string, pos?: { x: number; y: number }) => BoardAction[]
> = {
  swot: (topic, pos = { x: -520, y: -320 }) => {
    const t = topic || "your project";
    return [
      {
        type: "create_layout" as const,
        title: `SWOT Analysis: ${t}`,
        position: pos,
        columns: 2,
        sections: [
          { heading: "Strengths", color: "green" as const, items: [`Key strength of ${t}`, "Internal advantage", "Core competency"] },
          { heading: "Weaknesses", color: "red" as const, items: ["Weakness to address", "Resource gap", "Known limitation"] },
          { heading: "Opportunities", color: "blue" as const, items: ["Market opportunity", "Growth potential", "Emerging trend"] },
          { heading: "Threats", color: "orange" as const, items: ["Competitive threat", "External risk", "Market challenge"] },
        ],
      },
    ];
  },
  kanban: (topic, pos = { x: -600, y: -300 }) => [
    {
      type: "create_layout" as const,
      title: topic ? `Kanban: ${topic}` : "Kanban Board",
      position: pos,
      columns: 4,
      sections: [
        { heading: "To Do", color: "grey" as const, items: ["Task 1", "Task 2", "Task 3"] },
        { heading: "In Progress", color: "blue" as const, items: ["Active task"] },
        { heading: "Review", color: "orange" as const, items: [] },
        { heading: "Done", color: "green" as const, items: [] },
      ],
    },
  ],
  retrospective: (topic, pos = { x: -500, y: -300 }) => [
    {
      type: "create_layout" as const,
      title: topic ? `Retro: ${topic}` : "Retrospective",
      position: pos,
      columns: 3,
      sections: [
        { heading: "What Went Well", color: "green" as const, items: ["Positive outcome 1", "Positive outcome 2"] },
        { heading: "What Didn't", color: "red" as const, items: ["Issue to address", "Pain point"] },
        { heading: "Action Items", color: "blue" as const, items: ["Next step 1", "Next step 2"] },
      ],
    },
  ],
  pros_cons: (topic, pos = { x: -400, y: -300 }) => [
    {
      type: "create_layout" as const,
      title: topic ? `Pros & Cons: ${topic}` : "Pros & Cons",
      position: pos,
      columns: 2,
      sections: [
        { heading: "Pros", color: "green" as const, items: ["Advantage 1", "Advantage 2", "Advantage 3"] },
        { heading: "Cons", color: "red" as const, items: ["Disadvantage 1", "Disadvantage 2", "Disadvantage 3"] },
      ],
    },
  ],
  user_journey: (topic, pos = { x: -700, y: -300 }) => [
    {
      type: "create_layout" as const,
      title: topic ? `User Journey: ${topic}` : "User Journey Map",
      position: pos,
      columns: 5,
      sections: [
        { heading: "Awareness", color: "light-blue" as const, items: ["Discovers product", "First impression"] },
        { heading: "Consideration", color: "blue" as const, items: ["Evaluates options", "Reads reviews"] },
        { heading: "Decision", color: "violet" as const, items: ["Makes purchase", "Signs up"] },
        { heading: "Onboarding", color: "green" as const, items: ["Setup experience", "First success"] },
        { heading: "Retention", color: "orange" as const, items: ["Ongoing value", "Loyalty"] },
      ],
    },
  ],
  mind_map: (topic, pos = { x: -200, y: -200 }) => {
    const t = topic || "Main Topic";
    return [
      {
        type: "create_flowchart" as const,
        title: t,
        position: pos,
        direction: "horizontal" as const,
        nodes: [
          { id: "center", label: t, shape: "ellipse" as const, color: "violet" as const },
          { id: "b1", label: "Branch 1", shape: "rectangle" as const, color: "blue" as const },
          { id: "b2", label: "Branch 2", shape: "rectangle" as const, color: "green" as const },
          { id: "b3", label: "Branch 3", shape: "rectangle" as const, color: "orange" as const },
          { id: "b4", label: "Branch 4", shape: "rectangle" as const, color: "red" as const },
        ],
        edges: [
          { from: "center", to: "b1" },
          { from: "center", to: "b2" },
          { from: "center", to: "b3" },
          { from: "center", to: "b4" },
        ],
      },
    ];
  },
  timeline: (topic, pos = { x: -600, y: -200 }) => [
    {
      type: "create_layout" as const,
      title: topic ? `Timeline: ${topic}` : "Timeline",
      position: pos,
      columns: 5,
      sections: [
        { heading: "Phase 1", color: "light-blue" as const, items: ["Milestone 1"] },
        { heading: "Phase 2", color: "blue" as const, items: ["Milestone 2"] },
        { heading: "Phase 3", color: "violet" as const, items: ["Milestone 3"] },
        { heading: "Phase 4", color: "green" as const, items: ["Milestone 4"] },
        { heading: "Phase 5", color: "orange" as const, items: ["Milestone 5"] },
      ],
    },
  ],
  eisenhower_matrix: (topic, pos = { x: -520, y: -320 }) => [
    {
      type: "create_layout" as const,
      title: topic ? `Priority Matrix: ${topic}` : "Eisenhower Matrix",
      position: pos,
      columns: 2,
      sections: [
        { heading: "Urgent & Important (DO)", color: "red" as const, items: ["Critical task"] },
        { heading: "Not Urgent & Important (SCHEDULE)", color: "blue" as const, items: ["Plan this"] },
        { heading: "Urgent & Not Important (DELEGATE)", color: "orange" as const, items: ["Delegate this"] },
        { heading: "Not Urgent & Not Important (ELIMINATE)", color: "grey" as const, items: ["Consider dropping"] },
      ],
    },
  ],
  empathy_map: (topic, pos = { x: -520, y: -320 }) => [
    {
      type: "create_layout" as const,
      title: topic ? `Empathy Map: ${topic}` : "Empathy Map",
      position: pos,
      columns: 2,
      sections: [
        { heading: "Says", color: "blue" as const, items: ["Direct quotes", "Key phrases"] },
        { heading: "Thinks", color: "violet" as const, items: ["Beliefs", "Assumptions"] },
        { heading: "Does", color: "green" as const, items: ["Actions", "Behaviors"] },
        { heading: "Feels", color: "orange" as const, items: ["Emotions", "Frustrations"] },
      ],
    },
  ],
  business_model_canvas: (topic, pos = { x: -700, y: -400 }) => [
    {
      type: "create_layout" as const,
      title: topic ? `BMC: ${topic}` : "Business Model Canvas",
      position: pos,
      columns: 5,
      sections: [
        { heading: "Key Partners", color: "violet" as const, items: ["Partner 1"] },
        { heading: "Key Activities", color: "blue" as const, items: ["Activity 1"] },
        { heading: "Value Propositions", color: "green" as const, items: ["Value 1"] },
        { heading: "Customer Relationships", color: "orange" as const, items: ["Relationship 1"] },
        { heading: "Customer Segments", color: "red" as const, items: ["Segment 1"] },
        { heading: "Key Resources", color: "light-blue" as const, items: ["Resource 1"] },
        { heading: "Channels", color: "light-green" as const, items: ["Channel 1"] },
        { heading: "Cost Structure", color: "grey" as const, items: ["Cost 1"] },
        { heading: "Revenue Streams", color: "yellow" as const, items: ["Revenue 1"] },
      ],
    },
  ],
};

// ─── Execute a single board action against tldraw ────────────
function executeSingleAction(editor: Editor, action: BoardAction): void {
  switch (action.type) {
    case "create_sticky": {
      editor.createShape({
        id: createShapeId(),
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
      // Batch all stickies in one editor.batch() call
      editor.batch(() => {
        for (const sticky of action.stickies) {
          editor.createShape({
            id: createShapeId(),
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
      });
      break;
    }

    case "create_text": {
      editor.createShape({
        id: createShapeId(),
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
      const geoMap: Record<string, string> = {
        rectangle: "rectangle",
        ellipse: "ellipse",
        diamond: "diamond",
        star: "star",
      };
      editor.createShape({
        id: createShapeId(),
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
      editor.createShape({
        id: createShapeId(),
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
      editor.createShape({
        id: createShapeId(),
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
      editor.batch(() => {
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
      });
      break;
    }

    case "summarize_board": {
      editor.createShape({
        id: createShapeId(),
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
      editor.createShape({
        id: createShapeId(),
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
            props: { text: action.newText },
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
            props: { color: action.color },
          });
        }
      } catch (e) {
        console.warn(`[executeAction] Could not change color of ${action.shapeId}:`, e);
      }
      break;
    }

    case "group_items": {
      editor.batch(() => {
        for (const group of action.groups) {
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

          let offsetX = LAYOUT.FRAME_PADDING_X;
          let offsetY = LAYOUT.FRAME_HEADER_HEIGHT;
          let col = 0;
          const maxCols = Math.floor(
            (group.frameWidth || LAYOUT.DEFAULT_GROUP_FRAME_WIDTH) / LAYOUT.STICKY_SPACING
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
                offsetY += LAYOUT.STICKY_SPACING;
              } else {
                offsetX += LAYOUT.STICKY_SPACING;
              }
            } catch (e) {
              console.warn(`[executeAction] Could not move shape ${shapeId} into group:`, e);
            }
          }
        }
      });
      break;
    }

    // ═══════════════════════════════════════════════════════════
    // COMPOUND TOOLS — execute everything in a single batch
    // ═══════════════════════════════════════════════════════════

    case "create_layout": {
      editor.batch(() => {
        const baseX = action.position.x;
        const baseY = action.position.y;
        const cols = Math.max(1, Math.min(action.columns ?? 1, 6));
        const sectionWidth = LAYOUT.LAYOUT_SECTION_WIDTH;
        const sectionGap = LAYOUT.LAYOUT_SECTION_GAP;

        // Title text
        editor.createShape({
          id: createShapeId(),
          type: "text",
          x: baseX,
          y: baseY - 50,
          props: { text: action.title, size: "l", color: "black" },
        });

        action.sections.forEach((section, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const frameX = baseX + col * (sectionWidth + sectionGap);
          const itemCount = section.items.length;
          const stickyRows = Math.ceil(itemCount / 2);
          const frameHeight = Math.max(
            LAYOUT.LAYOUT_MIN_FRAME_HEIGHT,
            LAYOUT.FRAME_HEADER_HEIGHT + stickyRows * LAYOUT.STICKY_SPACING + 30
          );
          const frameY = baseY + row * (frameHeight + sectionGap);

          // Frame for section
          editor.createShape({
            id: createShapeId(),
            type: "frame",
            x: frameX,
            y: frameY,
            props: {
              w: sectionWidth,
              h: frameHeight,
              name: section.heading,
            },
          });

          // Stickies inside the frame (2-column grid)
          section.items.forEach((text, itemIdx) => {
            const sCol = itemIdx % 2;
            const sRow = Math.floor(itemIdx / 2);
            editor.createShape({
              id: createShapeId(),
              type: "note",
              x: frameX + LAYOUT.FRAME_PADDING_X + sCol * LAYOUT.STICKY_SPACING,
              y: frameY + LAYOUT.FRAME_HEADER_HEIGHT + sRow * LAYOUT.STICKY_SPACING,
              props: {
                text,
                color: section.color || "yellow",
                size: "m",
              },
            });
          });
        });
      });
      break;
    }

    case "create_flowchart": {
      editor.batch(() => {
        const baseX = action.position.x;
        const baseY = action.position.y;
        const isHorizontal = (action.direction ?? "horizontal") === "horizontal";
        const nodeW = LAYOUT.FLOWCHART_NODE_W;
        const nodeH = LAYOUT.FLOWCHART_NODE_H;
        const gap = LAYOUT.FLOWCHART_GAP;

        // Title
        if (action.title) {
          editor.createShape({
            id: createShapeId(),
            type: "text",
            x: baseX,
            y: baseY - 50,
            props: { text: action.title, size: "l", color: "black" },
          });
        }

        // Create nodes and track their tldraw IDs
        const nodeIdMap = new Map<string, TLShapeId>();
        const geoMap: Record<string, string> = {
          rectangle: "rectangle",
          ellipse: "ellipse",
          diamond: "diamond",
        };

        action.nodes.forEach((node, idx) => {
          const tlId = createShapeId();
          nodeIdMap.set(node.id, tlId);

          const nx = isHorizontal ? baseX + idx * (nodeW + gap) : baseX;
          const ny = isHorizontal ? baseY : baseY + idx * (nodeH + gap);

          editor.createShape({
            id: tlId,
            type: "geo",
            x: nx,
            y: ny,
            props: {
              w: nodeW,
              h: nodeH,
              geo: geoMap[node.shape ?? "rectangle"] || "rectangle",
              color: node.color || "light-blue",
              text: node.label,
            },
          });
        });

        // Create edges as positional arrows between node centers.
        // We use point-based start/end (not bindings) because nodes
        // are created in the same batch and may not be queryable yet.
        const nodePositions = new Map<string, { x: number; y: number }>();
        action.nodes.forEach((node, idx) => {
          const nx = isHorizontal ? baseX + idx * (nodeW + gap) : baseX;
          const ny = isHorizontal ? baseY : baseY + idx * (nodeH + gap);
          nodePositions.set(node.id, { x: nx + nodeW / 2, y: ny + nodeH / 2 });
        });

        for (const edge of action.edges) {
          const fromPos = nodePositions.get(edge.from);
          const toPos = nodePositions.get(edge.to);
          if (!fromPos || !toPos) continue;

          editor.createShape({
            id: createShapeId(),
            type: "arrow",
            x: fromPos.x,
            y: fromPos.y,
            props: {
              text: edge.label || "",
              color: "black",
              start: { x: 0, y: 0 },
              end: { x: toPos.x - fromPos.x, y: toPos.y - fromPos.y },
            },
          });
        }
      });
      break;
    }

    case "bulk_create": {
      editor.batch(() => {
        for (const item of action.items) {
          const id = createShapeId();
          switch (item.kind) {
            case "sticky":
              editor.createShape({
                id,
                type: "note",
                x: item.position.x,
                y: item.position.y,
                props: {
                  text: item.text || "",
                  color: item.color || "yellow",
                  size: "m",
                },
              });
              break;
            case "text":
              editor.createShape({
                id,
                type: "text",
                x: item.position.x,
                y: item.position.y,
                props: {
                  text: item.text || "",
                  size: item.size || "m",
                  color: item.color || "black",
                },
              });
              break;
            case "shape":
              editor.createShape({
                id,
                type: "geo",
                x: item.position.x,
                y: item.position.y,
                props: {
                  w: item.width || LAYOUT.DEFAULT_SHAPE_SIZE,
                  h: item.height || LAYOUT.DEFAULT_SHAPE_SIZE,
                  geo: item.shapeType || "rectangle",
                  color: item.color || "black",
                  text: item.text || "",
                },
              });
              break;
            case "frame":
              editor.createShape({
                id,
                type: "frame",
                x: item.position.x,
                y: item.position.y,
                props: {
                  w: item.width || LAYOUT.DEFAULT_FRAME_WIDTH,
                  h: item.height || LAYOUT.DEFAULT_FRAME_HEIGHT,
                  name: item.text || "",
                },
              });
              break;
          }
        }
      });
      break;
    }

    case "create_template": {
      // Expand the template into sub-actions and execute them recursively
      const templateFn = TEMPLATE_DEFS[action.template];
      if (templateFn) {
        const subActions = templateFn(
          action.topic,
          action.position ?? { x: -520, y: -320 }
        );
        for (const sub of subActions) {
          executeSingleAction(editor, sub);
        }
      } else {
        console.warn(`[executeAction] Unknown template: ${action.template}`);
      }
      break;
    }
  }
}

// ─── Compound action types that should skip per-item delays ──
const COMPOUND_TYPES = new Set([
  "create_layout",
  "create_flowchart",
  "bulk_create",
  "create_template",
  "create_multiple_stickies",
  "group_items",
]);

/**
 * Execute an array of board actions with animated delays.
 * Compound actions execute in a single batch (no per-item delay).
 * Returns the count of successfully executed actions.
 */
export async function executeActions(
  editor: Editor,
  actions: BoardAction[],
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  let completed = 0;
  const total = actions.length;

  for (const action of actions) {
    try {
      executeSingleAction(editor, action);
      completed++;
      onProgress?.(completed, total);

      // Only add animation delay for simple, non-compound actions
      if (!COMPOUND_TYPES.has(action.type)) {
        await sleep(LAYOUT.ANIMATION_DELAY);
      } else {
        // Minimal delay for compound — just enough for render
        await sleep(LAYOUT.COMPOUND_DELAY);
      }
    } catch (error) {
      console.error("[executeActions] Failed to execute action:", action.type, error);
    }
  }

  return completed;
}

/**
 * Serialize the current board state for sending to the AI agent.
 * Uses a compact format to reduce token usage — only sends fields the LLM needs.
 * ~60% fewer tokens than sending full props objects.
 */
export function serializeBoardState(editor: Editor) {
  const shapes = editor.getCurrentPageShapes();

  return {
    shapes: shapes.map((shape) => {
      const props = shape.props as Record<string, unknown>;
      // Compact: only include fields that matter for AI context
      const entry: Record<string, unknown> = {
        id: shape.id,
        type: shape.type,
        x: Math.round(shape.x),
        y: Math.round(shape.y),
      };
      // Only include text if present (saves tokens for empty shapes)
      const text = props?.text || props?.label || props?.name;
      if (text) entry.text = text;
      // Only include dimensions for frames and geo shapes
      if (shape.type === "frame" || shape.type === "geo") {
        if (props?.w) entry.w = Math.round(props.w as number);
        if (props?.h) entry.h = Math.round(props.h as number);
      }
      // Only include color if not default
      if (props?.color && props.color !== "black" && props.color !== "yellow") {
        entry.color = props.color;
      }
      return entry;
    }),
  };
}
