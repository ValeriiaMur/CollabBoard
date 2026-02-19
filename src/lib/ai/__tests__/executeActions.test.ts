/**
 * Unit tests for Board Action Executor
 *
 * Tests all 13 action handlers against a mock tldraw Editor.
 * Verifies correct shape creation, updates, and error resilience.
 *
 * We mock tldraw via vi.mock hoisting + use vi.useFakeTimers to
 * skip the 150ms animation delays so tests run instantly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BoardAction } from "../tools";

// ─── Mock tldraw (hoisted before any import) ──────────────────

let shapeIdCounter = 0;

vi.mock("tldraw", () => ({
  createShapeId: () => `shape:test_${++shapeIdCounter}`,
}));

// Now import the module under test (mock is already in place)
import { executeActions, serializeBoardState } from "../executeActions";

// ─── Mock tldraw Editor ────────────────────────────────────────

interface MockShape {
  id: string;
  type: string;
  x?: number;
  y?: number;
  props: Record<string, unknown>;
}

function createMockEditor() {
  const shapes: MockShape[] = [];

  return {
    shapes,
    createShape: vi.fn((shape: MockShape) => {
      shapes.push(shape);
    }),
    updateShape: vi.fn((update: Partial<MockShape> & { id: string }) => {
      const existing = shapes.find((s) => s.id === update.id);
      if (!existing) throw new Error(`Shape ${update.id} not found`);
      Object.assign(existing, update);
    }),
    getShape: vi.fn((id: string) => {
      return shapes.find((s) => s.id === id) || null;
    }),
    getCurrentPageShapes: vi.fn(() => shapes),
    inputs: { currentPagePoint: { x: 0, y: 0 } },
    on: vi.fn(),
  };
}

// ─── Use fake timers to skip animation delays ─────────────────

beforeEach(() => {
  shapeIdCounter = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// Helper: run executeActions and fast-forward all timers
async function runActions(editor: any, actions: BoardAction[], onProgress?: any) {
  const promise = executeActions(editor, actions, onProgress);
  // Flush all pending setTimeout calls (the 150ms animation delays)
  await vi.runAllTimersAsync();
  return promise;
}

// ─── Creation tools ────────────────────────────────────────────

describe("executeActions — Creation tools", () => {
  let editor: ReturnType<typeof createMockEditor>;

  beforeEach(() => {
    editor = createMockEditor();
  });

  it("create_sticky — creates a note shape", async () => {
    const actions: BoardAction[] = [
      { type: "create_sticky", text: "Test idea", position: { x: 100, y: 200 }, color: "yellow" },
    ];

    const count = await runActions(editor, actions);
    expect(count).toBe(1);
    expect(editor.createShape).toHaveBeenCalledOnce();

    const call = editor.createShape.mock.calls[0][0];
    expect(call.type).toBe("note");
    expect(call.x).toBe(100);
    expect(call.y).toBe(200);
    expect(call.props.text).toBe("Test idea");
    expect(call.props.color).toBe("yellow");
  });

  it("create_multiple_stickies — creates each sticky", async () => {
    const actions: BoardAction[] = [
      {
        type: "create_multiple_stickies",
        stickies: [
          { text: "Idea 1", position: { x: 0, y: 0 }, color: "yellow" },
          { text: "Idea 2", position: { x: 250, y: 0 }, color: "blue" },
          { text: "Idea 3", position: { x: 500, y: 0 }, color: "green" },
        ],
      },
    ];

    await runActions(editor, actions);
    expect(editor.createShape).toHaveBeenCalledTimes(3);
  });

  it("create_text — creates a text shape", async () => {
    const actions: BoardAction[] = [
      { type: "create_text", text: "Title", position: { x: 50, y: 50 }, size: "l" },
    ];

    await runActions(editor, actions);
    const call = editor.createShape.mock.calls[0][0];
    expect(call.type).toBe("text");
    expect(call.props.text).toBe("Title");
    expect(call.props.size).toBe("l");
  });

  it("create_shape — creates a geo shape (rectangle)", async () => {
    const actions: BoardAction[] = [
      {
        type: "create_shape",
        shapeType: "rectangle",
        position: { x: 0, y: 0 },
        width: 300,
        height: 200,
        color: "blue",
        label: "My Box",
      },
    ];

    await runActions(editor, actions);
    const call = editor.createShape.mock.calls[0][0];
    expect(call.type).toBe("geo");
    expect(call.props.geo).toBe("rectangle");
    expect(call.props.w).toBe(300);
    expect(call.props.h).toBe(200);
    expect(call.props.text).toBe("My Box");
  });

  it("create_shape — creates ellipse, diamond, star", async () => {
    for (const shapeType of ["ellipse", "diamond", "star"] as const) {
      const ed = createMockEditor();
      await runActions(ed, [
        { type: "create_shape", shapeType, position: { x: 0, y: 0 }, width: 200, height: 200, color: "black" },
      ]);
      expect(ed.createShape.mock.calls[0][0].props.geo).toBe(shapeType);
    }
  });

  it("create_arrow — creates an arrow shape", async () => {
    const actions: BoardAction[] = [
      { type: "create_arrow", start: { x: 0, y: 0 }, end: { x: 300, y: 200 }, label: "flow" },
    ];

    await runActions(editor, actions);
    const call = editor.createShape.mock.calls[0][0];
    expect(call.type).toBe("arrow");
    expect(call.props.text).toBe("flow");
  });

  it("create_frame — creates a frame shape", async () => {
    const actions: BoardAction[] = [
      { type: "create_frame", position: { x: -500, y: -300 }, width: 600, height: 400, label: "Strengths" },
    ];

    await runActions(editor, actions);
    const call = editor.createShape.mock.calls[0][0];
    expect(call.type).toBe("frame");
    expect(call.props.w).toBe(600);
    expect(call.props.h).toBe(400);
    expect(call.props.name).toBe("Strengths");
  });

  it("create_connector — creates a bound arrow between shapes", async () => {
    editor.shapes.push(
      { id: "shape:a", type: "note", props: { text: "A" } },
      { id: "shape:b", type: "note", props: { text: "B" } },
    );

    const actions: BoardAction[] = [
      { type: "create_connector", fromId: "shape:a", toId: "shape:b", label: "depends on", style: "arrow" },
    ];

    await runActions(editor, actions);
    const call = editor.createShape.mock.calls[0][0];
    expect(call.type).toBe("arrow");
    expect((call.props.start as any).type).toBe("binding");
    expect((call.props.end as any).type).toBe("binding");
    expect((call.props.start as any).boundShapeId).toBe("shape:a");
    expect((call.props.end as any).boundShapeId).toBe("shape:b");
  });
});

// ─── Manipulation tools ────────────────────────────────────────

describe("executeActions — Manipulation tools", () => {
  let editor: ReturnType<typeof createMockEditor>;

  beforeEach(() => {
    editor = createMockEditor();
    editor.shapes.push(
      { id: "shape:1", type: "note", x: 0, y: 0, props: { text: "Original", color: "yellow" } },
      { id: "shape:2", type: "geo", x: 100, y: 100, props: { w: 200, h: 200, text: "", color: "black" } },
    );
  });

  it("move_shapes — updates shape positions", async () => {
    const actions: BoardAction[] = [
      { type: "move_shapes", moves: [{ shapeId: "shape:1", position: { x: 500, y: 600 } }] },
    ];

    await runActions(editor, actions);
    expect(editor.updateShape).toHaveBeenCalledOnce();
    expect(editor.updateShape.mock.calls[0][0].x).toBe(500);
    expect(editor.updateShape.mock.calls[0][0].y).toBe(600);
  });

  it("resize_object — updates width/height", async () => {
    await runActions(editor, [
      { type: "resize_object", shapeId: "shape:2", width: 400, height: 300 },
    ]);
    expect(editor.getShape).toHaveBeenCalledWith("shape:2");
    expect(editor.updateShape).toHaveBeenCalled();
  });

  it("update_text — changes text prop", async () => {
    await runActions(editor, [
      { type: "update_text", shapeId: "shape:1", newText: "Updated!" },
    ]);
    expect(editor.getShape).toHaveBeenCalledWith("shape:1");
    expect(editor.updateShape.mock.calls[0][0].props.text).toBe("Updated!");
  });

  it("change_color — changes color prop", async () => {
    await runActions(editor, [
      { type: "change_color", shapeId: "shape:1", color: "red" },
    ]);
    expect(editor.updateShape.mock.calls[0][0].props.color).toBe("red");
  });

  it("handles missing shape ID gracefully (no crash)", async () => {
    const count = await runActions(editor, [
      { type: "update_text", shapeId: "shape:nonexistent", newText: "test" },
    ]);
    expect(count).toBe(1);
  });
});

// ─── Analysis tools ────────────────────────────────────────────

describe("executeActions — Analysis tools", () => {
  let editor: ReturnType<typeof createMockEditor>;

  beforeEach(() => {
    editor = createMockEditor();
  });

  it("summarize_board — creates a summary sticky", async () => {
    await runActions(editor, [
      { type: "summarize_board", summary: "5 ideas about product strategy", position: { x: 0, y: 500 } },
    ]);
    const call = editor.createShape.mock.calls[0][0];
    expect(call.type).toBe("note");
    expect(call.props.text).toContain("Summary");
    expect(call.props.text).toContain("5 ideas about product strategy");
    expect(call.props.color).toBe("light-blue");
  });

  it("group_items — creates frames and moves shapes", async () => {
    editor.shapes.push(
      { id: "shape:a", type: "note", x: 0, y: 0, props: { text: "A" } },
      { id: "shape:b", type: "note", x: 100, y: 0, props: { text: "B" } },
    );

    await runActions(editor, [
      {
        type: "group_items",
        groups: [{
          label: "Group 1",
          color: "blue",
          shapeIds: ["shape:a", "shape:b"],
          framePosition: { x: 0, y: 0 },
          frameWidth: 500,
          frameHeight: 400,
        }],
      },
    ]);
    expect(editor.createShape).toHaveBeenCalledOnce(); // frame
    expect(editor.updateShape).toHaveBeenCalledTimes(2); // moved shapes
  });
});

// ─── Progress callback ─────────────────────────────────────────

describe("executeActions — Progress callback", () => {
  it("calls onProgress for each action", async () => {
    const editor = createMockEditor();
    const onProgress = vi.fn();

    await runActions(editor, [
      { type: "create_sticky", text: "A", position: { x: 0, y: 0 }, color: "yellow" },
      { type: "create_sticky", text: "B", position: { x: 250, y: 0 }, color: "blue" },
    ], onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith(1, 2);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });
});

// ─── serializeBoardState ───────────────────────────────────────

describe("serializeBoardState", () => {
  it("serializes shapes with rounded coordinates", () => {
    const editor = createMockEditor();
    editor.shapes.push(
      { id: "shape:1", type: "note", x: 100.7, y: 200.3, props: { text: "Hello" } },
      { id: "shape:2", type: "geo", x: -50.2, y: 300.9, props: { label: "Box" } },
    );

    const state = serializeBoardState(editor as any);
    expect(state.shapes).toHaveLength(2);
    expect(state.shapes[0].x).toBe(101);
    expect(state.shapes[0].y).toBe(200);
    expect(state.shapes[1].x).toBe(-50);
  });

  it("returns empty array for empty board", () => {
    const editor = createMockEditor();
    const state = serializeBoardState(editor as any);
    expect(state.shapes).toHaveLength(0);
  });
});
