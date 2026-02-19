/**
 * AI Board Tool Definitions
 *
 * These are the structured tool schemas that the LLM can call to manipulate the board.
 * Each tool maps to a tldraw editor action executed on the client.
 *
 * Design principle: The LLM returns structured JSON actions, the client executes them.
 * This keeps the server stateless and lets Yjs handle sync automatically.
 *
 * Required tool schema (from spec):
 *   createStickyNote, createShape, createFrame, createConnector,
 *   moveObject, resizeObject, updateText, changeColor, getBoardState
 */

import { z } from "zod";

// ─── Position schema (reused across tools) ──────────────────
const PositionSchema = z.object({
  x: z.number().describe("X coordinate on the canvas"),
  y: z.number().describe("Y coordinate on the canvas"),
});

// ─── Color options ──────────────────────────────────────────
export const STICKY_COLORS = [
  "yellow",
  "blue",
  "green",
  "violet",
  "red",
  "orange",
  "grey",
  "light-blue",
  "light-green",
  "light-red",
  "light-violet",
] as const;

export const SHAPE_COLORS = [
  "black",
  "grey",
  "light-violet",
  "violet",
  "blue",
  "light-blue",
  "yellow",
  "orange",
  "green",
  "light-green",
  "light-red",
  "red",
] as const;

// ─── 1. Create Sticky Note ─────────────────────────────────
export const CreateStickySchema = z.object({
  type: z.literal("create_sticky"),
  text: z.string().describe("The text content of the sticky note"),
  position: PositionSchema.describe("Where to place the sticky on the canvas"),
  color: z.enum(STICKY_COLORS).optional().default("yellow").describe("Color of the sticky note"),
});

// ─── 2. Create Multiple Stickies (brainstorm / templates) ──
export const CreateMultipleStickiesSchema = z.object({
  type: z.literal("create_multiple_stickies"),
  stickies: z
    .array(
      z.object({
        text: z.string(),
        position: PositionSchema,
        color: z.enum(STICKY_COLORS).optional().default("yellow"),
      })
    )
    .describe("Array of sticky notes to create"),
});

// ─── 3. Create Text ────────────────────────────────────────
export const CreateTextSchema = z.object({
  type: z.literal("create_text"),
  text: z.string().describe("The text content"),
  position: PositionSchema,
  size: z.enum(["s", "m", "l", "xl"]).optional().default("m").describe("Font size"),
});

// ─── 4. Create Shape ───────────────────────────────────────
export const CreateShapeSchema = z.object({
  type: z.literal("create_shape"),
  shapeType: z
    .enum(["rectangle", "ellipse", "diamond", "star"])
    .describe("The type of shape to create"),
  position: PositionSchema,
  width: z.number().optional().default(200).describe("Width of the shape"),
  height: z.number().optional().default(200).describe("Height of the shape"),
  color: z.enum(SHAPE_COLORS).optional().default("black"),
  label: z.string().optional().describe("Optional text label inside the shape"),
});

// ─── 5. Create Connector (arrow between shapes by ID) ──────
export const CreateConnectorSchema = z.object({
  type: z.literal("create_connector"),
  fromId: z.string().describe("ID of the source shape"),
  toId: z.string().describe("ID of the target shape"),
  label: z.string().optional().describe("Optional label on the connector"),
  style: z.enum(["arrow", "line"]).optional().default("arrow"),
});

// ─── 6. Create Arrow (positional, no binding) ──────────────
export const CreateArrowSchema = z.object({
  type: z.literal("create_arrow"),
  start: PositionSchema.describe("Start point of the arrow"),
  end: PositionSchema.describe("End point of the arrow"),
  label: z.string().optional().describe("Optional label on the arrow"),
});

// ─── 7. Create Frame (group) ───────────────────────────────
export const CreateFrameSchema = z.object({
  type: z.literal("create_frame"),
  position: PositionSchema,
  width: z.number().optional().default(600),
  height: z.number().optional().default(400),
  label: z.string().optional().describe("Frame title/label"),
});

// ─── 8. Move Object(s) ─────────────────────────────────────
export const MoveShapesSchema = z.object({
  type: z.literal("move_shapes"),
  moves: z
    .array(
      z.object({
        shapeId: z.string().describe("The ID of the shape to move"),
        position: PositionSchema.describe("New position for the shape"),
      })
    )
    .describe("Array of shape movements"),
});

// ─── 9. Resize Object ──────────────────────────────────────
export const ResizeObjectSchema = z.object({
  type: z.literal("resize_object"),
  shapeId: z.string().describe("The ID of the shape to resize"),
  width: z.number().describe("New width"),
  height: z.number().describe("New height"),
});

// ─── 10. Update Text ───────────────────────────────────────
export const UpdateTextSchema = z.object({
  type: z.literal("update_text"),
  shapeId: z.string().describe("The ID of the shape whose text to update"),
  newText: z.string().describe("The new text content"),
});

// ─── 11. Change Color ──────────────────────────────────────
export const ChangeColorSchema = z.object({
  type: z.literal("change_color"),
  shapeId: z.string().describe("The ID of the shape to recolor"),
  color: z.string().describe("New color value (e.g. 'red', 'blue', 'light-green')"),
});

// ─── 12. Summarize Board ───────────────────────────────────
export const SummarizeBoardSchema = z.object({
  type: z.literal("summarize_board"),
  summary: z.string().describe("A concise summary of all board content"),
  position: PositionSchema.describe("Where to place the summary sticky"),
});

// ─── 13. Group Related Items ───────────────────────────────
export const GroupItemsSchema = z.object({
  type: z.literal("group_items"),
  groups: z
    .array(
      z.object({
        label: z.string().describe("Name for this group/cluster"),
        color: z.enum(STICKY_COLORS).describe("Color theme for this group"),
        shapeIds: z.array(z.string()).describe("IDs of shapes belonging to this group"),
        framePosition: PositionSchema.describe("Where to place the group frame"),
        frameWidth: z.number().optional().default(500),
        frameHeight: z.number().optional().default(400),
      })
    )
    .describe("Groups of related items to cluster together"),
});

// ─── Union of all tool actions ──────────────────────────────
export const BoardActionSchema = z.discriminatedUnion("type", [
  CreateStickySchema,
  CreateMultipleStickiesSchema,
  CreateTextSchema,
  CreateShapeSchema,
  CreateConnectorSchema,
  CreateArrowSchema,
  CreateFrameSchema,
  MoveShapesSchema,
  ResizeObjectSchema,
  UpdateTextSchema,
  ChangeColorSchema,
  SummarizeBoardSchema,
  GroupItemsSchema,
]);

export type BoardAction = z.infer<typeof BoardActionSchema>;

// ─── Tool descriptions for the LLM system prompt ───────────
export const TOOL_DESCRIPTIONS = `
You have the following tools to manipulate a collaborative whiteboard:

CREATION TOOLS:
1. **create_sticky** — Create a single sticky note. Params: text, position {x,y}, color.
2. **create_multiple_stickies** — Create many sticky notes at once (for brainstorming, templates). Params: stickies[{text, position, color}].
3. **create_text** — Add a text label to the board. Params: text, position, size (s/m/l/xl).
4. **create_shape** — Create a geometric shape. Params: shapeType (rectangle/ellipse/diamond/star), position, width, height, color, label.
5. **create_connector** — Draw a connector between two shapes by their IDs. Params: fromId, toId, label, style (arrow/line).
6. **create_arrow** — Draw an arrow between two points (when you don't have shape IDs). Params: start {x,y}, end {x,y}, label.
7. **create_frame** — Create a frame to visually group items. Params: position, width, height, label.

MANIPULATION TOOLS:
8. **move_shapes** — Move existing shapes to new positions. Params: moves[{shapeId, position}].
9. **resize_object** — Resize a shape. Params: shapeId, width, height.
10. **update_text** — Change the text of an existing shape. Params: shapeId, newText.
11. **change_color** — Change the color of an existing shape. Params: shapeId, color.

ANALYSIS TOOLS:
12. **summarize_board** — Create a summary sticky from all board content. Params: summary, position.
13. **group_items** — Cluster related items into labeled frames. Params: groups[{label, color, shapeIds, framePosition, frameWidth, frameHeight}].

LAYOUT GUIDELINES:
- Canvas coordinates: (0,0) is center. Positive x = right, positive y = down.
- Sticky notes are roughly 200x200 pixels. Space them at least 230px apart.
- For brainstorming, use a grid layout starting from (-400, -300).
- For organizing, cluster related items near each other with frames around them.
- For templates (SWOT, retro, journey map), use frames as quadrants/columns with stickies inside.

TEMPLATE EXAMPLES:
- SWOT Analysis: Create 4 frames (Strengths, Weaknesses, Opportunities, Threats) in a 2x2 grid, each ~500x400. Add a few starter stickies inside each.
- Retrospective: Create 3 frames side by side (What Went Well, What Didn't, Action Items), each ~400x500.
- User Journey Map: Create 5 frames in a horizontal row (Awareness, Consideration, Decision, Onboarding, Retention), each ~350x500.
- Pros/Cons: Create 2 frames side by side with green stickies for pros, red for cons.
- Kanban: Create 3-4 frames (To Do, In Progress, Review, Done) in a row.

CRITICAL — EXACT TYPE VALUES:
Every action object in the "actions" array MUST have a "type" field set to one of these EXACT strings:
  "create_sticky", "create_multiple_stickies", "create_text", "create_shape",
  "create_connector", "create_arrow", "create_frame", "move_shapes",
  "resize_object", "update_text", "change_color", "summarize_board", "group_items"

Do NOT use any other type values like "create_note", "add_sticky", "createSticky", "frame", "sticky", etc.

EXAMPLE — SWOT Analysis response:
{
  "reasoning": "Creating a SWOT analysis with 4 frames and starter stickies",
  "actions": [
    { "type": "create_frame", "position": { "x": -520, "y": -320 }, "width": 500, "height": 400, "label": "Strengths" },
    { "type": "create_frame", "position": { "x": 20, "y": -320 }, "width": 500, "height": 400, "label": "Weaknesses" },
    { "type": "create_frame", "position": { "x": -520, "y": 120 }, "width": 500, "height": 400, "label": "Opportunities" },
    { "type": "create_frame", "position": { "x": 20, "y": 120 }, "width": 500, "height": 400, "label": "Threats" },
    { "type": "create_sticky", "text": "Strong brand", "position": { "x": -490, "y": -260 }, "color": "green" },
    { "type": "create_sticky", "text": "Limited budget", "position": { "x": 50, "y": -260 }, "color": "red" }
  ]
}

Always respond with a JSON object: { "reasoning": "...", "actions": [...] }
`;
