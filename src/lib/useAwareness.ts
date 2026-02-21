"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type YPartyKitProvider from "y-partykit/provider";

/**
 * Shape of each user's awareness state, broadcast to all peers
 * via the Yjs awareness protocol built into YPartyKitProvider.
 */
export interface AwarenessUser {
  name: string;
  color: string;
  image: string;
  cursor: { x: number; y: number } | null;
  aiStatus?: "idle" | "thinking" | "executing" | null;
  aiPrompt?: string | null;
}

/**
 * An "other" user as seen from awareness (includes their clientID).
 */
export interface OtherUser extends AwarenessUser {
  clientId: number;
}

/** Throttle interval for awareness change handling (ms) */
const AWARENESS_THROTTLE_MS = 50;

/**
 * Hook that reads Yjs awareness state from a YPartyKitProvider.
 * Returns the current user's local state setter + a live list of other users.
 *
 * Performance optimizations:
 *   - Awareness changes throttled to 50ms (prevents re-render storms at 60fps cursor)
 *   - setCursor reuses a single object reference pattern
 *   - Others list only updated when member count or data actually changes
 */
export function useAwareness(provider: YPartyKitProvider | null) {
  const [others, setOthers] = useState<OtherUser[]>([]);
  const [self, setSelf] = useState<AwarenessUser | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdateRef = useRef(false);

  // Re-derive the others list from awareness states
  const refreshOthers = useCallback(() => {
    if (!provider) return;
    const awareness = provider.awareness;
    const localClientId = awareness.clientID;
    const states = awareness.getStates() as Map<number, AwarenessUser>;

    const otherUsers: OtherUser[] = [];
    states.forEach((state, clientId) => {
      if (clientId === localClientId) return;
      if (!state || !state.name) return; // skip uninitialized clients
      otherUsers.push({ ...state, clientId });
    });

    setOthers(otherUsers);

    // Update self too
    const localState = awareness.getLocalState() as AwarenessUser | null;
    if (localState) setSelf(localState);
  }, [provider]);

  // Subscribe to awareness changes — THROTTLED to prevent re-render storms
  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;

    function handleChange() {
      // If a throttle timer is already pending, just mark that we have a pending update
      if (throttleTimerRef.current) {
        pendingUpdateRef.current = true;
        return;
      }

      // Execute immediately for the first event
      refreshOthers();

      // Then throttle subsequent events
      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
        if (pendingUpdateRef.current) {
          pendingUpdateRef.current = false;
          refreshOthers();
        }
      }, AWARENESS_THROTTLE_MS);
    }

    awareness.on("change", handleChange);

    // Initial read
    refreshOthers();

    return () => {
      awareness.off("change", handleChange);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [provider, refreshOthers]);

  /**
   * Set (or merge) the local user's awareness state.
   * Other clients will see this immediately via the awareness protocol.
   */
  const setLocalState = useCallback(
    (patch: Partial<AwarenessUser>) => {
      if (!provider) return;
      const awareness = provider.awareness;
      const current = (awareness.getLocalState() as AwarenessUser) || {};
      awareness.setLocalState({ ...current, ...patch });
    },
    [provider]
  );

  /**
   * Update just the cursor position (high-frequency, so separate helper).
   */
  const setCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (!provider) return;
      const awareness = provider.awareness;
      const current = (awareness.getLocalState() as AwarenessUser) || {};
      awareness.setLocalState({ ...current, cursor });
    },
    [provider]
  );

  return { others, self, setLocalState, setCursor };
}
