/**
 * Claude Agent Runner
 *
 * Separate from the existing OpenAI/LangChain agent.
 * Uses Anthropic Claude API directly for multi-agent visual collaboration.
 *
 * Returns the same BoardAction[] format so it integrates with existing
 * action executors (both client-side and server-side Yjs).
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
    // Build board context
    const boardContext =
      boardState.shapes.length > 0
        ? `\n\nCURRENT BOARD STATE (${boardState.shapes.length} items):\n${JSON.stringify(
            boardState.shapes.map((s) => ({
              id: s.id,
              type: s.type,
              x: Math.round(s.x),
              y: Math.round(s.y),
              text:
                (s.props as Record<string, unknown>)?.text ||
                (s.props as Record<string, unknown>)?.label ||
                "",
            })),
            null,
            2
          )}`
        : "\n\nThe board is currently empty.";

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
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

    // Normalize action types and colors before Zod validation
    if (Array.isArray(parsed.actions)) {
      for (const action of parsed.actions) {
        // Normalize type aliases
        if (action.type && TYPE_ALIASES[action.type]) {
          action.type = TYPE_ALIASES[action.type];
        }
        // Normalize colors (LLMs often invent colors like "pink", "purple", etc.)
        if (action.color) {
          action.color = normalizeColor(action.color, "yellow");
        }
        // Normalize colors inside create_multiple_stickies
        if (Array.isArray(action.stickies)) {
          for (const sticky of action.stickies) {
            if (sticky.color) {
              sticky.color = normalizeColor(sticky.color, "yellow");
            }
          }
        }
        // Normalize colors inside group_items
        if (Array.isArray(action.groups)) {
          for (const group of action.groups) {
            if (group.color) {
              group.color = normalizeColor(group.color, "yellow");
            }
          }
        }
      }
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
