/**
 * Shared constants for the AI agent module.
 *
 * TYPE_ALIASES normalizes LLM-generated action type names to canonical
 * snake_case values matching our Zod schema. GPT-4o-mini sometimes
 * returns camelCase, shorthand, or invented names — this map catches them.
 */

/** Canonical action type strings (must match BoardActionSchema discriminator) */
export const VALID_ACTION_TYPES = [
  "create_sticky",
  "create_multiple_stickies",
  "create_text",
  "create_shape",
  "create_connector",
  "create_arrow",
  "create_frame",
  "move_shapes",
  "resize_object",
  "update_text",
  "change_color",
  "summarize_board",
  "group_items",
] as const;

export type ActionType = (typeof VALID_ACTION_TYPES)[number];

/** Map of common LLM type-name variants → canonical action type */
export const TYPE_ALIASES: Readonly<Record<string, ActionType>> = {
  // camelCase variants
  createSticky: "create_sticky",
  createStickyNote: "create_sticky",
  createNote: "create_sticky",
  createMultipleStickies: "create_multiple_stickies",
  createText: "create_text",
  createShape: "create_shape",
  createConnector: "create_connector",
  createArrow: "create_arrow",
  createFrame: "create_frame",
  moveShapes: "move_shapes",
  moveObject: "move_shapes",
  resizeObject: "resize_object",
  updateText: "update_text",
  changeColor: "change_color",
  summarizeBoard: "summarize_board",
  groupItems: "group_items",
  // short / alternate names
  sticky: "create_sticky",
  note: "create_sticky",
  add_sticky: "create_sticky",
  add_note: "create_sticky",
  text: "create_text",
  add_text: "create_text",
  shape: "create_shape",
  add_shape: "create_shape",
  connector: "create_connector",
  arrow: "create_arrow",
  frame: "create_frame",
  add_frame: "create_frame",
  move: "move_shapes",
  resize: "resize_object",
  recolor: "change_color",
  color: "change_color",
  summarize: "summarize_board",
  group: "group_items",
  // create_ prefix without exact match
  create_note: "create_sticky",
  create_sticky_note: "create_sticky",
};

// ─── Layout defaults for executeActions ──────────────────────
export const LAYOUT = {
  /** Delay between animated action executions (ms) */
  ANIMATION_DELAY: 150,
  /** Default sticky note dimensions */
  STICKY_SIZE: 200,
  /** Minimum spacing between stickies */
  STICKY_SPACING: 230,
  /** Default shape dimensions */
  DEFAULT_SHAPE_SIZE: 200,
  /** Default frame dimensions */
  DEFAULT_FRAME_WIDTH: 600,
  DEFAULT_FRAME_HEIGHT: 400,
  /** Group/frame inner padding */
  FRAME_PADDING_X: 20,
  FRAME_HEADER_HEIGHT: 50,
  /** Default group frame dimensions */
  DEFAULT_GROUP_FRAME_WIDTH: 500,
  DEFAULT_GROUP_FRAME_HEIGHT: 400,
} as const;
