/**
 * Claude Agent Runner
 *
 * Separate from the existing OpenAI/LangChain agent.
 * Uses Anthropic Claude API directly for multi-agent visual collaboration.
 *
 * Returns the same BoardAction[] format so it integrates with existing
 * action executors (both client-side and server-side Yjs).
 *
 * Performance optimizations (v2):
 *   - Higher max_tokens (4096) for compound tool responses
 *   - Compact board state (no pretty-print)
 *   - Color normalization for all compound tool sub-fields
 */

import Anthropic from "@anthropic-ai/sdk";
import { BoardActionSchema, STICKY_COLORS, SHAPE_COLORS, type BoardAction } from "./tools";
import { TYPE_ALIASES } from "./constants";
import { AGENT_PERSONALITIES, type PersonalityId } from "./personalities";
import type { BoardState, AgentResponse } from "./agent";
import { z } from "zod";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

const AgentResponseSchema = z.object({
  reasoning: z.string(),
  actions: z.array(BoardActionSchema),
});

/** Map invalid LLM color names → closest valid tldraw color */
const COLOR_ALIASES: Record<string, string> = {
  pink: "light-red",
  "light-pink": "light-red",
  magenta: "light-violet",
  purple: "violet",
  "light-purple": "light-violet",
  cyan: "light-blue",
  teal: "light-green",
  brown: "orange",
  white: "grey",
  navy: "blue",
  lime: "light-green",
  maroon: "red",
  gold: "yellow",
  coral: "orange",
  salmon: "light-red",
  indigo: "violet",
  turquoise: "light-blue",
};

const VALID_STICKY_SET = new Set<string>(STICKY_COLORS);
const VALID_SHAPE_SET = new Set<string>(SHAPE_COLORS);

/** Normalize a color value — map aliases and fallback to a default */
function normalizeColor(color: unknown, fallback: string): string {
  if (typeof color !== "string") return fallback;
  const lower = color.toLowerCase().trim();
  if (VALID_STICKY_SET.has(lower) || VALID_SHAPE_SET.has(lower)) return lower;
  return COLOR_ALIASES[lower] || fallback;
}

/** Strip null values recursively — LLMs send "topic": null instead of omitting */
function stripNulls(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) {
      delete obj[key];
    } else if (Array.isArray(obj[key])) {
      for (const item of obj[key] as unknown[]) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          stripNulls(item as Record<string, unknown>);
        }
      }
    } else if (typeof obj[key] === "object") {
      stripNulls(obj[key] as Record<string, unknown>);
    }
  }
}

/** Normalize all actions — types, colors, and compound sub-fields */
function normalizeActions(actions: unknown[]): void {
  for (const action of actions) {
    if (!action || typeof action !== "object") continue;
    const a = action as Record<string, unknown>;

    // Strip null values — LLMs often send "topic": null instead of omitting
    stripNulls(a);

    // Normalize type aliases
    if (a.type && typeof a.type === "string" && TYPE_ALIASES[a.type]) {
      a.type = TYPE_ALIASES[a.type];
    }

    // Normalize top-level color
    if (a.color) {
      a.color = normalizeColor(a.color, "yellow");
    }

    // Normalize colors inside create_multiple_stickies
    if (Array.isArray(a.stickies)) {
      for (const sticky of a.stickies) {
        if (sticky?.color) sticky.color = normalizeColor(sticky.color, "yellow");
      }
    }

    // Normalize colors inside group_items
    if (Array.isArray(a.groups)) {
      for (const group of a.groups) {
        if (group?.color) group.color = normalizeColor(group.color, "yellow");
      }
    }

    // Normalize colors inside create_layout sections
    if (Array.isArray(a.sections)) {
      for (const section of a.sections) {
        if (section?.color) section.color = normalizeColor(section.color, "yellow");
      }
    }

    // Normalize colors inside create_flowchart nodes
    if (Array.isArray(a.nodes)) {
      for (const node of a.nodes) {
        if (node?.color) node.color = normalizeColor(node.color, "light-blue");
      }
    }

    // Normalize colors inside bulk_create items
    if (Array.isArray(a.items)) {
      for (const item of a.items) {
        if (item?.color) item.color = normalizeColor(item.color, "yellow");
      }
    }
  }
}

/**
 * Run a Claude agent with a specific personality.
 * Returns structured board actions that can be executed on the canvas.
 */
export async function runClaudeAgent({
  prompt,
  boardState,
  personality,
  boardId,
}: {
  prompt: string;
  boardState: BoardState;
  personality: PersonalityId;
  boardId: string;
}): Promise<AgentResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      actions: [],
      error: "ANTHROPIC_API_KEY not configured.",
    };
  }

  const agent = AGENT_PERSONALITIES[personality];
  if (!agent) {
    return {
      actions: [],
      error: `Unknown personality: ${personality}`,
    };
  }

  const client = new Anthropic({ apiKey });

  try {
    // Build compact board context (no pretty-print = fewer tokens)
    const boardContext =
      boardState.shapes.length > 0
        ? `\n\nCURRENT BOARD STATE (${boardState.shapes.length} items):\n${JSON.stringify(
            boardState.shapes.map((s) => {
              const entry: Record<string, unknown> = {
                id: s.id,
                type: s.type,
                x: Math.round(s.x),
                y: Math.round(s.y),
              };
              const text =
                (s.props as Record<string, unknown>)?.text ||
                (s.props as Record<string, unknown>)?.label ||
                "";
              if (text) entry.text = text;
              return entry;
            })
          )}`
        : "\n\nThe board is currently empty.";

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: agent.systemPrompt,
      messages: [
        {
          role: "user",
          content: `${prompt}${boardContext}`,
        },
      ],
    });

    // Extract text content
    const textBlock = response.content.find((block: { type: string }) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { actions: [], error: "No text response from Claude" };
    }

    // Parse JSON from response (Claude may wrap in markdown code blocks)
    let jsonStr = textBlock.text.trim();

    // Strip markdown code fences if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Normalize action types, colors, and compound sub-fields
    if (Array.isArray(parsed.actions)) {
      normalizeActions(parsed.actions);
    }

    const validated = AgentResponseSchema.parse(parsed);

    console.log(
      `[Claude Agent] ${agent.name} for board ${boardId}: ${validated.actions.length} actions`
    );

    return {
      actions: validated.actions,
      reasoning: validated.reasoning,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`[Claude Agent] ${agent.name} error:`, errorMessage);

    if (error instanceof z.ZodError) {
      console.error(
        "[Claude Agent] Zod issues:",
        JSON.stringify(error.issues.slice(0, 3), null, 2)
      );
    }

    return {
      actions: [],
      error: errorMessage,
    };
  }
}
