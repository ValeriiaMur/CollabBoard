import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

/**
 * PartyKit server for CollabBoard.
 *
 * Each "room" corresponds to one whiteboard. The y-partykit onConnect
 * handler syncs a Yjs document across all connected clients, handles
 * awareness (cursors/presence), and persists state to Cloudflare
 * Durable Object storage so boards survive when everyone disconnects.
 *
 * Architecture:
 *   Client (tldraw) ↔ YPartyKitProvider ↔ WebSocket ↔ This server ↔ Yjs Doc + Storage
 */
export default class CollabBoardServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // y-partykit handles all Yjs sync, awareness, and persistence
    return onConnect(conn, this.room, {
      persist: { mode: "snapshot" },
      // Called when the document loads from storage (on first connect to a room)
      callback: {
        handler: (yDoc) => {
          // Optional: log or validate document state on load
          // console.log(`Room ${this.room.id} loaded with ${yDoc.store.length} entries`);
        },
      },
    });
  }
}

CollabBoardServer satisfies Party.Worker;
