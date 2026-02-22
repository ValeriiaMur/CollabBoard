/**
 * AI Agent — LangChain + OpenAI + Langfuse
 *
 * Processes natural language commands and returns structured board actions.
 *
 * Performance optimizations (v2):
 *   - Higher max_tokens (4096) for complex compound tool responses
 *   - Compact board state serialization (no pretty-print JSON)
 *   - System prompt steers LLM toward compound tools first
 *   - Color normalization applied before Zod validation
 */

import { ChatOpenAI } from "@langchain/openai";
import { CallbackHandler } from "langfuse-langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { TOOL_DESCRIPTIONS, BoardActionSchema, STICKY_COLORS, SHAPE_COLORS } from "./tools";
import { TYPE_ALIASES } from "./constants";
import { z } from "zod";

// ─── Model config (reads from env) ─────────────────────────
const MODEL_NAME = process.env.CHATGPT_MODEL || "gpt-4o-mini";

// ─── Types ──────────────────────────────────────────────────
export interface BoardState {
  shapes: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    props: Record<string, unknown>;
  }>;
}

export interface AgentResponse {
  actions: z.infer<typeof BoardActionSchema>[];
  reasoning?: string;
  error?: string;
}

// ─── Response schema ────────────────────────────────────────
const AgentResponseSchema = z.object({
  reasoning: z
    .string()
    .describe("Brief explanation of what you're doing and why"),
  actions: z
    .array(BoardActionSchema)
    .describe("Array of board manipulation actions to execute"),
});

// ─── Color normalization (shared with claude-agent) ──────────
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

const VALID_COLORS = new Set<string>([...STICKY_COLORS, ...SHAPE_COLORS]);

function normalizeColor(color: unknown, fallback: string): string {
  if (typeof color !== "string") return fallback;
  const lower = color.toLowerCase().trim();
  if (VALID_COLORS.has(lower)) return lower;
  return COLOR_ALIASES[lower] || fallback;
}

// ─── System prompt ──────────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI assistant for CollabBoard, a collaborative whiteboard application.
Your job is to help users brainstorm, organize, and visualize ideas on the board.

${TOOL_DESCRIPTIONS}

RESPONSE FORMAT:
Always respond with valid JSON matching this structure:
{
  "reasoning": "Brief explanation of what you're doing",
  "actions": [ ...array of tool actions... ]
}

BEHAVIOR:
- ALWAYS prefer compound tools (create_template, create_layout, create_flowchart) over many individual actions.
- When asked to brainstorm, use create_layout with categorized sections.
- When asked for any named template (SWOT, kanban, retro, etc.), use create_template.
- When asked about processes or workflows, use create_flowchart.
- When asked to organize, read the existing board state, identify clusters, and group related items.
- When asked to summarize, read all text on the board and create a concise summary.
- When asked to connect ideas, draw arrows between related stickies.
- Be creative with colors — use different sticky colors to represent different themes or categories.
- Always spread items out enough to be readable (min 230px between stickies).
- Position new content relative to existing content to avoid overlap.
- Accept any input format: plain text, lists, bullet points, CSV data, questions, comparisons, processes.
`;

// ─── Create Langfuse handler ────────────────────────────────
function createLangfuseHandler(boardId: string, userId?: string) {
  if (
    !process.env.LANGFUSE_PUBLIC_KEY ||
    !process.env.LANGFUSE_SECRET_KEY
  ) {
    return null;
  }

  try {
    return new CallbackHandler({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
      sessionId: `board-${boardId}`,
      userId: userId || "anonymous",
      tags: ["collabboard", "board-agent"],
    });
  } catch (e) {
    console.warn("[AI Agent] Langfuse init failed, tracing disabled:", String(e));
    return null;
  }
}

// ─── Strip null values from objects (LLMs send null for optional fields) ──
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

// ─── Normalize all actions before Zod validation ─────────────
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

// ─── Main agent function ────────────────────────────────────
export async function runBoardAgent({
  prompt,
  boardState,
  boardId,
  userId,
}: {
  prompt: string;
  boardState: BoardState;
  boardId: string;
  userId?: string;
}): Promise<AgentResponse> {
  const langfuseHandler = createLangfuseHandler(boardId, userId);

  try {
    // Initialize LLM — higher token limit for compound tool responses
    const llm = new ChatOpenAI({
      modelName: MODEL_NAME,
      temperature: 0.7,
      maxTokens: 4096,
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelKwargs: {
        response_format: { type: "json_object" },
      },
    });

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

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(`${prompt}${boardContext}`),
    ];

    // Call LLM with optional Langfuse tracing
    const callbacks = langfuseHandler ? [langfuseHandler] : [];

    const response = await llm.invoke(messages, { callbacks });

    // Parse response
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = JSON.parse(content);

    // ── Normalize action types + colors ─────────────────────
    if (Array.isArray(parsed.actions)) {
      normalizeActions(parsed.actions);
    }

    const validated = AgentResponseSchema.parse(parsed);

    // Flush Langfuse traces (non-blocking)
    if (langfuseHandler) {
      langfuseHandler.flushAsync().catch(() => {});
    }

    return {
      actions: validated.actions,
      reasoning: validated.reasoning,
    };
  } catch (error) {
    // Safe error logging — LangChain error objects can crash console.error
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[AI Agent] Error:", errorMessage);

    // If it's a Zod validation error, log the raw types for debugging
    if (error instanceof z.ZodError) {
      console.error("[AI Agent] Zod issues:", JSON.stringify(error.issues.slice(0, 3), null, 2));
    }

    // Flush traces even on error
    if (langfuseHandler) {
      langfuseHandler.flushAsync().catch(() => {});
    }

    return {
      actions: [],
      error: errorMessage,
    };
  }
}
