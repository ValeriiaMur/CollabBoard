/**
 * Agent Session — Server-Side Agent Lifecycle Manager
 *
 * Manages a single AI agent's lifecycle:
 *   1. Connect to PartyKit WebSocket as a "user" (the agent persona)
 *   2. Broadcast awareness state (name, color, status)
 *   3. Read current board state from Yjs
 *   4. Call Claude agent with personality + board context
 *   5. Execute returned actions as Yjs writes
 *   6. Disconnect and clean up
 *
 * All changes sync automatically to connected clients via Yjs CRDT.
 */

import * as Y from "yjs";
import { WebSocket } from "ws";
import YPartyKitProvider from "y-partykit/provider";
import { runClaudeAgent } from "../ai/claude-agent";
import { AGENT_PERSONALITIES, type PersonalityId } from "../ai/personalities";
import { executeActionsViaYjs, readBoardStateFromYjs } from "./executeActionsViaYjs";

// Polyfill WebSocket for server-side y-partykit
if (typeof globalThis.WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = WebSocket;
}

export interface AgentSessionConfig {
  agentId: string;
  boardId: string;
  personality: PersonalityId;
  userId: string;
  prompt: string;
  partyHostUrl: string;
}

export class AgentSession {
  private config: AgentSessionConfig;
  private yDoc: Y.Doc | null = null;
  private provider: YPartyKitProvider | null = null;
  private personality;

  constructor(config: AgentSessionConfig) {
    this.config = config;
    this.personality = AGENT_PERSONALITIES[config.personality];
  }

  /**
   * Run the full agent lifecycle.
   * Connects, thinks, creates, and disconnects.
   */
  async start(): Promise<void> {
    const { boardId, prompt, agentId } = this.config;
    const roomId = `board-${boardId}`;

    console.log(
      `[AgentSession] ${this.personality.name} (${agentId}) starting on room ${roomId}`
    );

    try {
      // 1. Connect to PartyKit
      this.yDoc = new Y.Doc();
      const yStore = this.yDoc.getMap<unknown>("tl_");

      this.provider = new YPartyKitProvider(
        this.config.partyHostUrl,
        roomId,
        this.yDoc,
        { connect: true }
      );

      // Wait for sync
      await this.waitForSync(10_000);

      // 2. Broadcast "thinking" status via awareness
      this.broadcastStatus("thinking", prompt);

      // 3. Read current board state
      const boardState = readBoardStateFromYjs(yStore);

      console.log(
        `[AgentSession] ${this.personality.name}: Board has ${boardState.shapes.length} shapes`
      );

      // 4. Call Claude agent
      const result = await runClaudeAgent({
        prompt,
        boardState,
        personality: this.config.personality,
        boardId,
      });

      if (result.error) {
        console.error(
          `[AgentSession] ${this.personality.name} error:`,
          result.error
        );
        this.broadcastStatus("idle");
        return;
      }

      if (result.actions.length === 0) {
        console.log(`[AgentSession] ${this.personality.name}: No actions returned`);
        this.broadcastStatus("idle");
        return;
      }

      // 5. Execute actions via Yjs
      this.broadcastStatus("executing", prompt);

      const executed = await executeActionsViaYjs(
        yStore,
        this.yDoc,
        result.actions,
        (completed, total) => {
          console.log(
            `[AgentSession] ${this.personality.name}: ${completed}/${total} actions`
          );
        }
      );

      console.log(
        `[AgentSession] ${this.personality.name}: Executed ${executed} actions`
      );

      // 6. Done
      this.broadcastStatus("idle");
    } catch (error) {
      console.error(
        `[AgentSession] ${this.personality.name} fatal error:`,
        error
      );
    } finally {
      // Clean up after a short delay (let final sync propagate)
      setTimeout(() => this.cleanup(), 2000);
    }
  }

  /**
   * Wait for the Yjs provider to sync with the server.
   */
  private waitForSync(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.provider) {
        reject(new Error("No provider"));
        return;
      }

      const timeout = setTimeout(() => {
        // Resolve anyway — we may have partial state
        console.warn(`[AgentSession] Sync timeout after ${timeoutMs}ms, proceeding`);
        resolve();
      }, timeoutMs);

      this.provider.on("sync", (synced: boolean) => {
        if (synced) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  /**
   * Broadcast agent status via Yjs awareness protocol.
   */
  private broadcastStatus(
    status: "thinking" | "executing" | "idle",
    prompt?: string
  ): void {
    if (!this.provider?.awareness) return;

    this.provider.awareness.setLocalState({
      name: this.personality.name,
      color: this.personality.color,
      image: this.personality.icon,
      cursor: null,
      aiStatus: status,
      aiPrompt: prompt || null,
    });
  }

  /**
   * Disconnect from PartyKit and clean up resources.
   */
  private cleanup(): void {
    try {
      if (this.provider) {
        // Clear awareness before disconnecting
        this.provider.awareness?.setLocalState(null);
        this.provider.disconnect();
        this.provider.destroy();
        this.provider = null;
      }
      if (this.yDoc) {
        this.yDoc.destroy();
        this.yDoc = null;
      }
      console.log(
        `[AgentSession] ${this.personality.name} (${this.config.agentId}) cleaned up`
      );
    } catch (e) {
      console.warn("[AgentSession] Cleanup error:", e);
    }
  }
}
