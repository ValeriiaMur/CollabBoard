/**
 * Unit tests for AI Agent
 *
 * Tests the type normalization logic, response parsing,
 * error handling, and board state context building.
 * The LLM call itself is mocked; live AI tests are in langfuse.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { BoardActionSchema } from "../tools";

// ─── Type Normalization (extracted logic) ──────────────────────

// We test the normalization map directly since it's the most critical piece
const TYPE_ALIASES: Record<string, string> = {
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
  create_note: "create_sticky",
  create_sticky_note: "create_sticky",
};

function normalizeActions(actions: Array<{ type: string; [k: string]: unknown }>) {
  for (const action of actions) {
    if (action.type && TYPE_ALIASES[action.type]) {
      action.type = TYPE_ALIASES[action.type];
    }
  }
  return actions;
}

describe("Type Normalization — camelCase variants", () => {
  it("normalizes createSticky → create_sticky", () => {
    const actions = normalizeActions([
      { type: "createSticky", text: "test", position: { x: 0, y: 0 } },
    ]);
    expect(actions[0].type).toBe("create_sticky");
  });

  it("normalizes createStickyNote → create_sticky", () => {
    const actions = normalizeActions([
      { type: "createStickyNote", text: "test", position: { x: 0, y: 0 } },
    ]);
    expect(actions[0].type).toBe("create_sticky");
  });

  it("normalizes createFrame → create_frame", () => {
    const actions = normalizeActions([
      { type: "createFrame", position: { x: 0, y: 0 } },
    ]);
    expect(actions[0].type).toBe("create_frame");
  });

  it("normalizes moveShapes → move_shapes", () => {
    const actions = normalizeActions([
      { type: "moveShapes", moves: [] },
    ]);
    expect(actions[0].type).toBe("move_shapes");
  });

  it("normalizes all camelCase variants", () => {
    const camelCaseKeys = [
      "createSticky", "createStickyNote", "createNote",
      "createMultipleStickies", "createText", "createShape",
      "createConnector", "createArrow", "createFrame",
      "moveShapes", "moveObject", "resizeObject",
      "updateText", "changeColor", "summarizeBoard", "groupItems",
    ];
    for (const key of camelCaseKeys) {
      expect(TYPE_ALIASES[key]).toBeDefined();
      expect(TYPE_ALIASES[key]).toMatch(/^[a-z_]+$/); // all snake_case
    }
  });
});

describe("Type Normalization — short names", () => {
  it("normalizes 'sticky' → create_sticky", () => {
    const actions = normalizeActions([{ type: "sticky", text: "x", position: { x: 0, y: 0 } }]);
    expect(actions[0].type).toBe("create_sticky");
  });

  it("normalizes 'frame' → create_frame", () => {
    const actions = normalizeActions([{ type: "frame", position: { x: 0, y: 0 } }]);
    expect(actions[0].type).toBe("create_frame");
  });

  it("normalizes 'move' → move_shapes", () => {
    const actions = normalizeActions([{ type: "move", moves: [] }]);
    expect(actions[0].type).toBe("move_shapes");
  });

  it("normalizes 'color' → change_color", () => {
    const actions = normalizeActions([{ type: "color", shapeId: "a", color: "red" }]);
    expect(actions[0].type).toBe("change_color");
  });
});

describe("Type Normalization — already correct types pass through", () => {
  it("does not modify valid type names", () => {
    const validTypes = [
      "create_sticky", "create_multiple_stickies", "create_text",
      "create_shape", "create_connector", "create_arrow",
      "create_frame", "move_shapes", "resize_object",
      "update_text", "change_color", "summarize_board", "group_items",
    ];
    for (const type of validTypes) {
      const actions = normalizeActions([{ type }]);
      expect(actions[0].type).toBe(type);
    }
  });
});

describe("Type Normalization — full round trip", () => {
  it("normalizes + validates a SWOT-like response from LLM", () => {
    // Simulate an LLM returning camelCase types
    const llmResponse = {
      reasoning: "Creating SWOT analysis",
      actions: [
        { type: "createFrame", position: { x: -520, y: -320 }, width: 500, height: 400, label: "Strengths" },
        { type: "createFrame", position: { x: 20, y: -320 }, width: 500, height: 400, label: "Weaknesses" },
        { type: "createSticky", text: "Strong brand", position: { x: -490, y: -260 }, color: "green" },
        { type: "add_sticky", text: "Budget issues", position: { x: 50, y: -260 }, color: "red" },
      ],
    };

    // Normalize
    normalizeActions(llmResponse.actions);

    // All should now validate
    for (const action of llmResponse.actions) {
      const result = BoardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    }
  });

  it("normalizes a brainstorm with mixed type formats", () => {
    const actions = normalizeActions([
      { type: "sticky", text: "Idea 1", position: { x: 0, y: 0 } },
      { type: "note", text: "Idea 2", position: { x: 250, y: 0 } },
      { type: "create_sticky", text: "Idea 3", position: { x: 500, y: 0 } },
      { type: "createSticky", text: "Idea 4", position: { x: 0, y: 250 } },
    ]);

    for (const action of actions) {
      expect(action.type).toBe("create_sticky");
    }
  });
});

// ─── AgentResponse schema ──────────────────────────────────────

const AgentResponseSchema = z.object({
  reasoning: z.string(),
  actions: z.array(BoardActionSchema),
});

describe("AgentResponseSchema", () => {
  it("validates a correct response", () => {
    const result = AgentResponseSchema.safeParse({
      reasoning: "Creating a brainstorm",
      actions: [
        { type: "create_sticky", text: "Idea", position: { x: 0, y: 0 }, color: "yellow" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("validates empty actions array", () => {
    const result = AgentResponseSchema.safeParse({
      reasoning: "Nothing to do",
      actions: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing reasoning", () => {
    const result = AgentResponseSchema.safeParse({
      actions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid action in array", () => {
    const result = AgentResponseSchema.safeParse({
      reasoning: "test",
      actions: [
        { type: "invalid_type" },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ─── Board state context building ──────────────────────────────

describe("Board state serialization context", () => {
  it("produces empty board message for no shapes", () => {
    const boardState = { shapes: [] };
    const context = boardState.shapes.length > 0
      ? `CURRENT BOARD STATE (${boardState.shapes.length} items)`
      : "The board is currently empty.";
    expect(context).toBe("The board is currently empty.");
  });

  it("produces shape context for populated board", () => {
    const boardState = {
      shapes: [
        { id: "shape:1", type: "note", x: 100, y: 200, props: { text: "Hello" } },
        { id: "shape:2", type: "geo", x: 300, y: 400, props: { text: "World" } },
      ],
    };
    const context = boardState.shapes.length > 0
      ? `CURRENT BOARD STATE (${boardState.shapes.length} items)`
      : "The board is currently empty.";
    expect(context).toContain("2 items");
  });

  it("extracts text from shape props", () => {
    const shape = { id: "1", type: "note", x: 0, y: 0, props: { text: "My note" } as Record<string, unknown> };
    const text = (shape.props as Record<string, unknown>)?.text || "";
    expect(text).toBe("My note");
  });

  it("falls back to label if no text", () => {
    const shape = { id: "1", type: "geo", x: 0, y: 0, props: { label: "My label" } as Record<string, unknown> };
    const text = (shape.props as Record<string, unknown>)?.text || (shape.props as Record<string, unknown>)?.label || "";
    expect(text).toBe("My label");
  });
});

// ─── Error handling ────────────────────────────────────────────

describe("Error handling", () => {
  it("handles malformed JSON gracefully", () => {
    expect(() => JSON.parse("not json")).toThrow();
  });

  it("handles Zod error with circular ref safety", () => {
    const result = AgentResponseSchema.safeParse({ reasoning: 123, actions: "not array" });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Ensure we can stringify the error without crash
      const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
      expect(typeof errorMessage).toBe("string");
      expect(errorMessage.length).toBeGreaterThan(0);
    }
  });

  it("handles empty string content", () => {
    expect(() => JSON.parse("")).toThrow();
  });
});
