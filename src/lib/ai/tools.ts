/**
 * AI Board Tool Definitions
 *
 * Structured tool schemas that the LLM can call to manipulate the board.
 * Each tool maps to a tldraw editor action executed on the client.
 *
 * Includes both simple tools (single shape ops) and COMPOUND tools
 * (create_layout, create_flowchart, bulk_create, create_template)
 * that produce complex layouts in a single LLM action — reducing
 * output tokens, round-trips, and execution time.
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

// ═══════════════════════════════════════════════════════════════
// COMPOUND TOOLS — high-level actions that create complex layouts
// in a single call. Drastically reduces LLM output tokens and
// round-trips compared to emitting many individual actions.
// ═══════════════════════════════════════════════════════════════

// ─── 14. Create Layout (frame + stickies in one shot) ──────
export const CreateLayoutSchema = z.object({
  type: z.literal("create_layout"),
  title: z.string().describe("Title for the layout / frame"),
  position: PositionSchema.describe("Top-left position of the layout"),
  columns: z.number().optional().default(1).describe("Number of columns in the grid (1-4)"),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("Section / frame title"),
        color: z.enum(STICKY_COLORS).optional().default("yellow"),
        items: z.array(z.string()).describe("Text items (each becomes a sticky note)"),
      })
    )
    .describe("Sections — each becomes a frame with stickies inside"),
});

// ─── 15. Create Flowchart (shapes + arrows in one shot) ─────
export const CreateFlowchartSchema = z.object({
  type: z.literal("create_flowchart"),
  title: z.string().optional().describe("Optional title for the flowchart"),
  position: PositionSchema.describe("Top-left starting position"),
  direction: z.enum(["horizontal", "vertical"]).optional().default("horizontal"),
  nodes: z
    .array(
      z.object({
        id: z.string().describe("Unique local ID for referencing in edges"),
        label: z.string().describe("Text label on the node"),
        shape: z.enum(["rectangle", "ellipse", "diamond"]).optional().default("rectangle"),
        color: z.enum(SHAPE_COLORS).optional().default("light-blue"),
      })
    )
    .describe("Nodes in the flowchart"),
  edges: z
    .array(
      z.object({
        from: z.string().describe("Source node id"),
        to: z.string().describe("Target node id"),
        label: z.string().optional().describe("Edge label"),
      })
    )
    .describe("Connections between nodes"),
});

// ─── 16. Bulk Create (mixed batch of any primitives) ────────
export const BulkCreateSchema = z.object({
  type: z.literal("bulk_create"),
  items: z
    .array(
      z.object({
        kind: z.enum(["sticky", "text", "shape", "frame"]).describe("What to create"),
        text: z.string().optional().describe("Text content or label"),
        position: PositionSchema,
        color: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        shapeType: z.enum(["rectangle", "ellipse", "diamond", "star"]).optional(),
        size: z.enum(["s", "m", "l", "xl"]).optional(),
      })
    )
    .describe("Array of items to create in a single batch"),
});

// ─── 17. Create Template (named template in one action) ─────
export const CreateTemplateSchema = z.object({
  type: z.literal("create_template"),
  template: z
    .enum([
      "swot",
      "kanban",
      "retrospective",
      "pros_cons",
      "user_journey",
      "mind_map",
      "timeline",
      "eisenhower_matrix",
      "empathy_map",
      "business_model_canvas",
    ])
    .describe("The template type to generate"),
  topic: z.string().optional().describe("Optional topic to pre-fill the template with relevant content"),
  position: PositionSchema.optional().describe("Where to place the template (defaults to center)"),
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
  // Compound tools
  CreateLayoutSchema,
  CreateFlowchartSchema,
  BulkCreateSchema,
  CreateTemplateSchema,
]);

export type BoardAction = z.infer<typeof BoardActionSchema>;

// ─── Tool descriptions for the LLM system prompt ───────────
export const TOOL_DESCRIPTIONS = `
You have tools to manipulate a collaborative whiteboard. PREFER COMPOUND TOOLS — they are faster and produce better layouts.

═══ COMPOUND TOOLS (use these first — they're faster and produce better results) ═══

1. **create_template** — Instantly generate a named template. The system auto-creates all frames and stickies.
   Params: template (swot|kanban|retrospective|pros_cons|user_journey|mind_map|timeline|eisenhower_matrix|empathy_map|business_model_canvas), topic?, position?.
   USE THIS whenever the user asks for any standard template/framework.

2. **create_layout** — Create a structured layout with titled sections, each containing sticky notes.
   Params: title, position, columns (1-4), sections[{heading, color, items[]}].
   USE THIS for any structured content with headings and items (brainstorms by category, multi-section boards, comparisons).

3. **create_flowchart** — Create a connected flowchart / process diagram in one action.
   Params: title?, position, direction (horizontal|vertical), nodes[{id, label, shape, color}], edges[{from, to, label?}].
   USE THIS for processes, workflows, decision trees, org charts.

4. **bulk_create** — Batch-create mixed items (stickies, shapes, text, frames) in one action.
   Params: items[{kind (sticky|text|shape|frame), text?, position, color?, width?, height?, shapeType?, size?}].
   USE THIS when you need varied item types scattered across the board.

═══ SIMPLE TOOLS (use when compound tools don't fit) ═══

5. **create_sticky** — One sticky note. Params: text, position, color.
6. **create_multiple_stickies** — Many stickies. Params: stickies[{text, position, color}].
7. **create_text** — Text label. Params: text, position, size (s/m/l/xl).
8. **create_shape** — Geometric shape. Params: shapeType (rectangle/ellipse/diamond/star), position, width, height, color, label.
9. **create_connector** — Arrow between shapes by ID. Params: fromId, toId, label, style (arrow/line).
10. **create_arrow** — Positional arrow. Params: start, end, label.
11. **create_frame** — Grouping frame. Params: position, width, height, label.

═══ MANIPULATION TOOLS ═══

12. **move_shapes** — Reposition shapes. Params: moves[{shapeId, position}].
13. **resize_object** — Resize. Params: shapeId, width, height.
14. **update_text** — Edit text. Params: shapeId, newText.
15. **change_color** — Recolor. Params: shapeId, color.

═══ ANALYSIS TOOLS ═══

16. **summarize_board** — Summary sticky. Params: summary, position.
17. **group_items** — Cluster items into frames. Params: groups[{label, color, shapeIds, framePosition}].

═══ LAYOUT GUIDELINES ═══
- (0,0) = center. +x = right, +y = down.
- Stickies ≈ 200×200px. Space ≥ 230px apart.
- For brainstorming: grid from (-400,-300).

═══ INPUT INTERPRETATION ═══
Users may provide various input types. Interpret them generously:
- Plain text → create stickies or structured layouts based on content
- Lists / bullet points → create stickies for each item, grouped in a frame
- CSV / tabular data → create a grid layout with headers as frames and rows as stickies
- URLs or references → create a sticky with the text content
- Questions → brainstorm answers as stickies
- Comparisons ("X vs Y") → use create_layout with 2 columns
- Processes ("how to...", "steps for...") → use create_flowchart
- Any framework/template name → use create_template

CRITICAL — EXACT TYPE VALUES:
  "create_sticky", "create_multiple_stickies", "create_text", "create_shape",
  "create_connector", "create_arrow", "create_frame", "move_shapes",
  "resize_object", "update_text", "change_color", "summarize_board", "group_items",
  "create_layout", "create_flowchart", "bulk_create", "create_template"

EXAMPLE — Structured brainstorm using create_layout:
{
  "reasoning": "User wants marketing ideas — using create_layout for a clean categorized grid",
  "actions": [
    {
      "type": "create_layout",
      "title": "Marketing Ideas",
      "position": { "x": -500, "y": -300 },
      "columns": 3,
      "sections": [
        { "heading": "Social Media", "color": "blue", "items": ["TikTok campaign", "Instagram reels", "LinkedIn thought leadership"] },
        { "heading": "Content", "color": "green", "items": ["Blog series", "Podcast launch", "Case studies"] },
        { "heading": "Events", "color": "orange", "items": ["Webinar series", "Conference booth", "Meetup sponsorship"] }
      ]
    }
  ]
}

EXAMPLE — Flowchart:
{
  "reasoning": "Creating a user signup flow",
  "actions": [
    {
      "type": "create_flowchart",
      "title": "User Signup Flow",
      "position": { "x": -300, "y": -200 },
      "direction": "horizontal",
      "nodes": [
        { "id": "start", "label": "Landing Page", "shape": "ellipse", "color": "light-blue" },
        { "id": "form", "label": "Sign Up Form", "shape": "rectangle", "color": "blue" },
        { "id": "verify", "label": "Email Verified?", "shape": "diamond", "color": "yellow" },
        { "id": "done", "label": "Dashboard", "shape": "ellipse", "color": "green" }
      ],
      "edges": [
        { "from": "start", "to": "form" },
        { "from": "form", "to": "verify" },
        { "from": "verify", "to": "done", "label": "Yes" }
      ]
    }
  ]
}

Always respond with JSON: { "reasoning": "...", "actions": [...] }
`;
