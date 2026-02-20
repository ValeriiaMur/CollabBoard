/**
 * Agent Simulation Hook
 *
 * Simulates AI agents as live users on the board. When agents return actions,
 * this hook creates fake awareness entries so agents appear in:
 *   - PresenceAvatars (avatar bubble at top)
 *   - LiveCursors (animated cursor moving on canvas)
 *
 * The agent cursor smoothly moves to each action's target position,
 * pauses briefly, then the action executes — making it look like
 * a real user drawing on the board.
 */

import { useCallback, useRef } from "react";
import type { Editor } from "tldraw";
import type { BoardAction } from "../ai/tools";
import type { PersonalityId } from "../ai/personalities";
import { AGENT_PERSONALITIES } from "../ai/personalities";
import type { OtherUser } from "../useAwareness";

/** How long the cursor takes to glide to the next position (ms) */
const CURSOR_MOVE_DURATION = 400;

/** Pause after cursor arrives before placing the shape (ms) */
const CURSOR_PAUSE = 150;

/** Pause after placing a shape before moving to the next (ms) */
const POST_ACTION_DELAY = 200;

/** Base clientId for simulated agents (high number to avoid collisions) */
const AGENT_CLIENT_ID_BASE = 900000;

/**
 * Extract the target position from any BoardAction.
 * Returns the coordinate where the agent cursor should move to.
 */
function getActionPosition(action: BoardAction): { x: number; y: number } | null {
  switch (action.type) {
    case "create_sticky":
    case "create_text":
    case "create_shape":
    case "create_frame":
    case "summarize_board":
      return action.position;
    case "create_arrow":
      return action.start;
    case "create_multiple_stickies":
      return action.stickies[0]?.position || null;
    case "create_connector":
      return null; // no position — connects existing shapes
    case "move_shapes":
      return action.moves[0]?.position || null;
    case "resize_object":
    case "update_text":
    case "change_color":
      return null; // modifies existing shapes
    case "group_items":
      return action.groups[0]?.framePosition || null;
    default:
      return null;
  }
}

/**
 * Flatten actions into individual steps with positions.
 * For create_multiple_stickies, each sticky becomes its own step.
 */
function flattenActions(actions: BoardAction[]): Array<{
  action: BoardAction;
  position: { x: number; y: number } | null;
}> {
  const steps: Array<{ action: BoardAction; position: { x: number; y: number } | null }> = [];

  for (const action of actions) {
    if (action.type === "create_multiple_stickies") {
      for (const sticky of action.stickies) {
        const singleAction: BoardAction = {
          type: "create_sticky",
          text: sticky.text,
          position: sticky.position,
          color: sticky.color || "yellow",
        };
        steps.push({ action: singleAction, position: sticky.position });
      }
    } else {
      steps.push({ action, position: getActionPosition(action) });
    }
  }

  return steps;
}

interface AgentSimulationCallbacks {
  /** Add a simulated agent to the others list */
  addAgent: (agent: OtherUser) => void;
  /** Update a simulated agent's state (cursor position, status) */
  updateAgent: (clientId: number, patch: Partial<OtherUser>) => void;
  /** Remove a simulated agent from the others list */
  removeAgent: (clientId: number) => void;
}

export function useAgentSimulation() {
  const activeAgentsRef = useRef<Set<number>>(new Set());

  /**
   * Execute a single agent's actions with animated cursor simulation.
   * The agent appears as a user, cursor moves to each position, then places the shape.
   */
  const simulateAgent = useCallback(
    async (
      editor: Editor,
      personality: PersonalityId,
      actions: BoardAction[],
      index: number,
      callbacks: AgentSimulationCallbacks
    ): Promise<number> => {
      const agent = AGENT_PERSONALITIES[personality];
      if (!agent || actions.length === 0) return 0;

      const clientId = AGENT_CLIENT_ID_BASE + index;
      activeAgentsRef.current.add(clientId);

      // 1. Add agent to presence (appears in avatars + cursors)
      callbacks.addAgent({
        clientId,
        name: agent.name,
        color: agent.color,
        image: agent.icon,
        cursor: null,
        aiStatus: "thinking",
        aiPrompt: null,
      });

      // Brief "thinking" pause
      await sleep(600);

      // 2. Switch to "executing" status
      callbacks.updateAgent(clientId, { aiStatus: "executing" });

      // 3. Flatten actions and execute with cursor animation
      const steps = flattenActions(actions);
      let executed = 0;

      for (const step of steps) {
        if (!activeAgentsRef.current.has(clientId)) break; // cancelled

        // Move cursor to target position
        if (step.position) {
          callbacks.updateAgent(clientId, {
            cursor: step.position,
          });
          await sleep(CURSOR_MOVE_DURATION);
          await sleep(CURSOR_PAUSE);
        }

        // Execute the action on the tldraw editor
        try {
          executeSingleActionOnEditor(editor, step.action);
          executed++;
        } catch (err) {
          console.warn(`[AgentSim] ${agent.name} action failed:`, err);
        }

        await sleep(POST_ACTION_DELAY);
      }

      // 4. Brief pause, then remove agent
      callbacks.updateAgent(clientId, { aiStatus: "idle", cursor: null });
      await sleep(1000);

      callbacks.removeAgent(clientId);
      activeAgentsRef.current.delete(clientId);

      return executed;
    },
    []
  );

  /** Cancel all active agent simulations */
  const cancelAll = useCallback(() => {
    activeAgentsRef.current.clear();
  }, []);

  return { simulateAgent, cancelAll };
}

/**
 * Execute a single BoardAction on the tldraw editor.
 * Uses minimal props only — tldraw validates strictly and rejects unknown properties.
 * Matches the prop style used in executeActions.ts (the working client-side executor).
 */
function executeSingleActionOnEditor(editor: Editor, action: BoardAction) {
  switch (action.type) {
    case "create_sticky": {
      editor.createShape({
        type: "note",
        x: action.position.x,
        y: action.position.y,
        props: {
          text: action.text,
          color: action.color || "yellow",
          size: "m",
        },
      });
      break;
    }
    case "create_text": {
      editor.createShape({
        type: "text",
        x: action.position.x,
        y: action.position.y,
        props: {
          text: action.text,
          size: action.size || "m",
          color: "black",
        },
      });
      break;
    }
    case "create_shape": {
      editor.createShape({
        type: "geo",
        x: action.position.x,
        y: action.position.y,
        props: {
          w: action.width || 200,
          h: action.height || 200,
          geo: action.shapeType || "rectangle",
          color: action.color || "black",
          text: action.label || "",
        },
      });
      break;
    }
    case "create_frame": {
      editor.createShape({
        type: "frame",
        x: action.position.x,
        y: action.position.y,
        props: {
          w: action.width || 600,
          h: action.height || 400,
          name: action.label || "",
        },
      });
      break;
    }
    case "create_arrow": {
      editor.createShape({
        type: "arrow",
        x: action.start.x,
        y: action.start.y,
        props: {
          start: { x: 0, y: 0 },
          end: {
            x: action.end.x - action.start.x,
            y: action.end.y - action.start.y,
          },
          text: action.label || "",
          color: "black",
        },
      });
      break;
    }
    case "summarize_board": {
      editor.createShape({
        type: "note",
        x: action.position.x,
        y: action.position.y,
        props: {
          text: `Summary\n\n${action.summary}`,
          color: "light-blue",
          size: "l",
        },
      });
      break;
    }
    default: {
      // For move/resize/update/change_color/connector/group — less common for agents
      break;
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
