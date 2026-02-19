/**
 * AI Agent — LangChain + OpenAI + Langfuse
 *
 * This module creates the AI agent that processes natural language commands
 * and returns structured board actions.
 *
 * Architecture:
 *   User prompt + board state → LLM (GPT-4o-mini) → structured JSON actions
 *   All calls traced via Langfuse CallbackHandler for observability + cost tracking.
 *
 * Senior AI Engineering practices:
 *   - Structured output (JSON mode) for reliable parsing
 *   - System prompt with tool descriptions + layout guidelines
 *   - Board state serialization for context-aware responses
 *   - Langfuse tracing for cost analysis, latency, debugging
 *   - Error boundaries with graceful fallbacks
 */

import { ChatOpenAI } from "@langchain/openai";
import { CallbackHandler } from "langfuse-langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { TOOL_DESCRIPTIONS, BoardActionSchema } from "./tools";
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
- When asked to brainstorm, generate 6-10 diverse ideas as sticky notes in a grid layout.
- When asked to organize, read the existing board state, identify clusters, and group related items.
- When asked to summarize, read all text on the board and create a concise summary.
- When asked to connect ideas, draw arrows between related stickies.
- Be creative with colors — use different sticky colors to represent different themes or categories.
- Always spread items out enough to be readable (min 230px between stickies).
- Position new content relative to existing content to avoid overlap.
`;

// ─── Create Langfuse handler ────────────────────────────────
function createLangfuseHandler(boardId: string, userId?: string) {
  // Only create handler if Langfuse credentials are configured
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
    // Initialize LLM — GPT-4o-mini for cost efficiency
    const llm = new ChatOpenAI({
      modelName: MODEL_NAME,
      temperature: 0.7,
      maxTokens: 2048,
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelKwargs: {
        response_format: { type: "json_object" },
      },
    });

    // Build context message with current board state
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

    // ── Normalize action types ─────────────────────────────
    // GPT-4o-mini sometimes invents type names; map them to our exact schema values.
    if (Array.isArray(parsed.actions)) {
      for (const action of parsed.actions) {
        if (action.type && TYPE_ALIASES[action.type]) {
          action.type = TYPE_ALIASES[action.type];
        }
      }
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
