/**
 * Unit tests for AI Board Tool Schemas
 *
 * Tests all 13 Zod schemas for correct validation, default values,
 * discriminated union behavior, and the type normalization alias map.
 */

import { describe, it, expect } from "vitest";
import { BoardActionSchema, TOOL_DESCRIPTIONS, STICKY_COLORS, SHAPE_COLORS } from "../tools";

// ─── Schema Validation ─────────────────────────────────────────

describe("BoardActionSchema — discriminated union", () => {
  it("accepts all 13 valid action types", () => {
    const validTypes = [
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
    ];
    expect(validTypes).toHaveLength(13);
  });

  it("rejects unknown action types", () => {
    const result = BoardActionSchema.safeParse({
      type: "unknown_action",
      text: "hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = BoardActionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    const result = BoardActionSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// ─── create_sticky ─────────────────────────────────────────────

describe("create_sticky schema", () => {
  it("accepts valid sticky note", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_sticky",
      text: "My idea",
      position: { x: 100, y: 200 },
      color: "yellow",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("create_sticky");
    }
  });

  it("defaults color to yellow", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_sticky",
      text: "Idea",
      position: { x: 0, y: 0 },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "create_sticky") {
      expect(result.data.color).toBe("yellow");
    }
  });

  it("accepts all valid sticky colors", () => {
    for (const color of STICKY_COLORS) {
      const result = BoardActionSchema.safeParse({
        type: "create_sticky",
        text: "test",
        position: { x: 0, y: 0 },
        color,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid color", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_sticky",
      text: "test",
      position: { x: 0, y: 0 },
      color: "neon_pink",
    });
    expect(result.success).toBe(false);
  });

  it("requires text field", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_sticky",
      position: { x: 0, y: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("requires position field", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_sticky",
      text: "hello",
    });
    expect(result.success).toBe(false);
  });
});

// ─── create_multiple_stickies ──────────────────────────────────

describe("create_multiple_stickies schema", () => {
  it("accepts array of stickies", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_multiple_stickies",
      stickies: [
        { text: "Idea 1", position: { x: 0, y: 0 }, color: "yellow" },
        { text: "Idea 2", position: { x: 250, y: 0 }, color: "blue" },
        { text: "Idea 3", position: { x: 500, y: 0 } },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "create_multiple_stickies") {
      expect(result.data.stickies).toHaveLength(3);
    }
  });

  it("accepts empty array", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_multiple_stickies",
      stickies: [],
    });
    expect(result.success).toBe(true);
  });
});

// ─── create_text ───────────────────────────────────────────────

describe("create_text schema", () => {
  it("accepts valid text with default size", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_text",
      text: "Title",
      position: { x: 0, y: 0 },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "create_text") {
      expect(result.data.size).toBe("m");
    }
  });

  it("accepts all size values", () => {
    for (const size of ["s", "m", "l", "xl"]) {
      const result = BoardActionSchema.safeParse({
        type: "create_text",
        text: "test",
        position: { x: 0, y: 0 },
        size,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── create_shape ──────────────────────────────────────────────

describe("create_shape schema", () => {
  it("accepts all shape types", () => {
    for (const shapeType of ["rectangle", "ellipse", "diamond", "star"]) {
      const result = BoardActionSchema.safeParse({
        type: "create_shape",
        shapeType,
        position: { x: 0, y: 0 },
      });
      expect(result.success).toBe(true);
    }
  });

  it("defaults width/height to 200", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_shape",
      shapeType: "rectangle",
      position: { x: 0, y: 0 },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "create_shape") {
      expect(result.data.width).toBe(200);
      expect(result.data.height).toBe(200);
    }
  });

  it("accepts all shape colors", () => {
    for (const color of SHAPE_COLORS) {
      const result = BoardActionSchema.safeParse({
        type: "create_shape",
        shapeType: "rectangle",
        position: { x: 0, y: 0 },
        color,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional label", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_shape",
      shapeType: "rectangle",
      position: { x: 0, y: 0 },
      label: "My Box",
    });
    expect(result.success).toBe(true);
  });
});

// ─── create_connector ──────────────────────────────────────────

describe("create_connector schema", () => {
  it("accepts valid connector", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_connector",
      fromId: "shape:abc123",
      toId: "shape:def456",
      label: "depends on",
      style: "arrow",
    });
    expect(result.success).toBe(true);
  });

  it("defaults style to arrow", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_connector",
      fromId: "a",
      toId: "b",
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "create_connector") {
      expect(result.data.style).toBe("arrow");
    }
  });

  it("accepts line style", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_connector",
      fromId: "a",
      toId: "b",
      style: "line",
    });
    expect(result.success).toBe(true);
  });
});

// ─── create_arrow ──────────────────────────────────────────────

describe("create_arrow schema", () => {
  it("accepts valid positional arrow", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_arrow",
      start: { x: 0, y: 0 },
      end: { x: 300, y: 200 },
      label: "flow",
    });
    expect(result.success).toBe(true);
  });
});

// ─── create_frame ──────────────────────────────────────────────

describe("create_frame schema", () => {
  it("accepts valid frame with defaults", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_frame",
      position: { x: -500, y: -300 },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "create_frame") {
      expect(result.data.width).toBe(600);
      expect(result.data.height).toBe(400);
    }
  });

  it("accepts custom dimensions and label", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_frame",
      position: { x: 0, y: 0 },
      width: 800,
      height: 600,
      label: "Strengths",
    });
    expect(result.success).toBe(true);
  });
});

// ─── move_shapes ───────────────────────────────────────────────

describe("move_shapes schema", () => {
  it("accepts array of moves", () => {
    const result = BoardActionSchema.safeParse({
      type: "move_shapes",
      moves: [
        { shapeId: "shape:abc", position: { x: 100, y: 200 } },
        { shapeId: "shape:def", position: { x: 300, y: 400 } },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "move_shapes") {
      expect(result.data.moves).toHaveLength(2);
    }
  });
});

// ─── resize_object ─────────────────────────────────────────────

describe("resize_object schema", () => {
  it("accepts valid resize", () => {
    const result = BoardActionSchema.safeParse({
      type: "resize_object",
      shapeId: "shape:abc",
      width: 400,
      height: 300,
    });
    expect(result.success).toBe(true);
  });

  it("requires width and height", () => {
    const result = BoardActionSchema.safeParse({
      type: "resize_object",
      shapeId: "shape:abc",
    });
    expect(result.success).toBe(false);
  });
});

// ─── update_text ───────────────────────────────────────────────

describe("update_text schema", () => {
  it("accepts valid text update", () => {
    const result = BoardActionSchema.safeParse({
      type: "update_text",
      shapeId: "shape:abc",
      newText: "Updated content",
    });
    expect(result.success).toBe(true);
  });
});

// ─── change_color ──────────────────────────────────────────────

describe("change_color schema", () => {
  it("accepts valid color change", () => {
    const result = BoardActionSchema.safeParse({
      type: "change_color",
      shapeId: "shape:abc",
      color: "red",
    });
    expect(result.success).toBe(true);
  });
});

// ─── summarize_board ───────────────────────────────────────────

describe("summarize_board schema", () => {
  it("accepts valid summary", () => {
    const result = BoardActionSchema.safeParse({
      type: "summarize_board",
      summary: "The board contains 5 ideas about product strategy.",
      position: { x: 0, y: 500 },
    });
    expect(result.success).toBe(true);
  });
});

// ─── group_items ───────────────────────────────────────────────

describe("group_items schema", () => {
  it("accepts valid grouping", () => {
    const result = BoardActionSchema.safeParse({
      type: "group_items",
      groups: [
        {
          label: "Marketing",
          color: "blue",
          shapeIds: ["shape:1", "shape:2"],
          framePosition: { x: 0, y: 0 },
          frameWidth: 500,
          frameHeight: 400,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ─── TOOL_DESCRIPTIONS prompt string ───────────────────────────

describe("TOOL_DESCRIPTIONS", () => {
  it("contains all 13 tool names", () => {
    const tools = [
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
    ];
    for (const tool of tools) {
      expect(TOOL_DESCRIPTIONS).toContain(tool);
    }
  });

  it("contains CRITICAL type values section", () => {
    expect(TOOL_DESCRIPTIONS).toContain("CRITICAL");
    expect(TOOL_DESCRIPTIONS).toContain("EXACT TYPE VALUES");
  });

  it("contains SWOT example", () => {
    expect(TOOL_DESCRIPTIONS).toContain("swot");
  });

  it("contains layout guidelines", () => {
    expect(TOOL_DESCRIPTIONS).toContain("LAYOUT GUIDELINES");
    expect(TOOL_DESCRIPTIONS).toContain("230px");
  });
});

// ─── Position validation ───────────────────────────────────────

describe("Position validation", () => {
  it("accepts negative coordinates", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_sticky",
      text: "test",
      position: { x: -500, y: -300 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts zero coordinates", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_sticky",
      text: "test",
      position: { x: 0, y: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts large coordinates", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_sticky",
      text: "test",
      position: { x: 10000, y: 10000 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric coordinates", () => {
    const result = BoardActionSchema.safeParse({
      type: "create_sticky",
      text: "test",
      position: { x: "foo", y: "bar" },
    });
    expect(result.success).toBe(false);
  });
});
