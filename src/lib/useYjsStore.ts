"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createTLStore,
  defaultShapeUtils,
  type TLRecord,
  type TLStoreWithStatus,
} from "tldraw";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import { createLogger } from "./logger";

const log = createLogger("useYjsStore");

/**
 * Custom hook that syncs a tldraw store with a PartyKit room via Yjs.
 *
 * Architecture:
 *   tldraw TLStore ↔ Y.Map("tl_") ↔ YPartyKitProvider ↔ WebSocket ↔ PartyKit Server
 *
 * - Y.Map holds the authoritative tldraw document state (keyed by record ID)
 * - YPartyKitProvider connects the Y.Doc to PartyKit's WebSocket backend
 * - Two-way binding: local tldraw changes → Yjs, remote Yjs changes → tldraw
 * - Conflict resolution is automatic (Yjs CRDT / last-write-wins per field)
 * - Awareness (cursors/presence) is handled by provider.awareness
 */
export function useYjsStore({
  roomId,
  hostUrl,
}: {
  roomId: string;
  hostUrl: string;
}) {
  const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
    status: "loading",
  });

  const { yDoc, yStore, provider } = useMemo(() => {
    const yDoc = new Y.Doc({ gc: true });
    const yStore = yDoc.getMap<TLRecord>("tl_");
    const provider = new YPartyKitProvider(hostUrl, roomId, yDoc, {
      connect: true,
    });
    return { yDoc, yStore, provider };
  }, [roomId, hostUrl]);

  useEffect(() => {
    const store = createTLStore({
      shapeUtils: defaultShapeUtils,
    });

    /* ─── Flags to prevent echo loops ─────────────────────── */
    let isSyncingFromYjs = false;
    let isSyncingFromStore = false;

    /* ─── Yjs → tldraw store ─────────────────────────────── */
    function handleYjsChange(
      events: Y.YEvent<Y.Map<TLRecord>>[],
      txn: Y.Transaction
    ) {
      if (isSyncingFromStore) return;
      if (txn.local) return; // only apply remote changes

      isSyncingFromYjs = true;
      store.mergeRemoteChanges(() => {
        for (const event of events) {
          event.changes.keys.forEach((change, key) => {
            switch (change.action) {
              case "add":
              case "update": {
                const record = yStore.get(key);
                if (record) {
                  store.put([record]);
                }
                break;
              }
              case "delete": {
                store.remove([key as TLRecord["id"]]);
                break;
              }
            }
          });
        }
      });
      isSyncingFromYjs = false;
    }

    yStore.observeDeep(handleYjsChange);

    /* ─── tldraw store → Yjs ─────────────────────────────── */
    const unsubStore = store.listen(
      ({ changes }) => {
        if (isSyncingFromYjs) return;

        isSyncingFromStore = true;
        yDoc.transact(() => {
          Object.values(changes.added).forEach((record) => {
            yStore.set(record.id, record);
          });
          Object.values(changes.updated).forEach(([_, record]) => {
            yStore.set(record.id, record);
          });
          Object.values(changes.removed).forEach((record) => {
            yStore.delete(record.id);
          });
        });
        isSyncingFromStore = false;
      },
      { source: "user", scope: "document" }
    );

    /* ─── Initial sync: load existing Yjs state into store ── */
    function loadInitialState() {
      const existingRecords: TLRecord[] = [];
      yStore.forEach((record) => {
        existingRecords.push(record);
      });
      if (existingRecords.length > 0) {
        store.mergeRemoteChanges(() => {
          store.put(existingRecords);
        });
      }
    }

    function handleSync(synced: boolean) {
      log.debug("sync event:", synced);
      if (synced) {
        loadInitialState();
        setStoreWithStatus({
          status: "synced-remote",
          connectionStatus: "online",
          store,
        });
      }
    }

    // If provider already synced (reconnect case), load immediately
    if (provider.synced) {
      log.debug("provider already synced");
      loadInitialState();
      setStoreWithStatus({
        status: "synced-remote",
        connectionStatus: "online",
        store,
      });
    }

    provider.on("sync", handleSync);

    // Track WebSocket connection status
    function handleStatus({ status }: { status: string }) {
      log.debug("connection status:", status);
      const connectionStatus: "online" | "offline" =
        status === "connected" ? "online" : "offline";
      setStoreWithStatus((prev) =>
        prev.status === "synced-remote"
          ? { ...prev, connectionStatus }
          : prev
      );
    }
    provider.on("status", handleStatus);

    // Connection timeout — if not synced within 10s, show error
    const timeout = setTimeout(() => {
      setStoreWithStatus((prev) => {
        if (prev.status === "loading") {
          log.error(
            "Connection timeout. Is PartyKit running on",
            hostUrl,
            "? Run: npx partykit dev"
          );
          return {
            status: "error" as const,
            error: new Error("Connection timeout — PartyKit server may not be running"),
          };
        }
        return prev;
      });
    }, 10000);

    /* ─── Cleanup ────────────────────────────────────────── */
    return () => {
      clearTimeout(timeout);
      unsubStore();
      yStore.unobserveDeep(handleYjsChange);
      provider.off("sync", handleSync);
      provider.off("status", handleStatus);
    };
  }, [yDoc, yStore, provider, hostUrl]);

  // Destroy provider + doc on full unmount
  useEffect(() => {
    return () => {
      provider.destroy();
      yDoc.destroy();
    };
  }, [provider, yDoc]);

  // Return both the store status AND the provider (needed for awareness/cursors)
  return { storeWithStatus, provider };
}
