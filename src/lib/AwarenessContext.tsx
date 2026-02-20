"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { OtherUser, AwarenessUser } from "./useAwareness";

interface AwarenessContextValue {
  /** Real awareness users + simulated agents combined */
  others: OtherUser[];
  self: AwarenessUser | null;
  setCursor: (cursor: { x: number; y: number } | null) => void;
  setLocalState: (patch: Partial<AwarenessUser>) => void;
  /** Add a simulated agent to the presence list */
  addSimulatedAgent: (agent: OtherUser) => void;
  /** Update a simulated agent's state (cursor, status, etc.) */
  updateSimulatedAgent: (clientId: number, patch: Partial<OtherUser>) => void;
  /** Remove a simulated agent from the presence list */
  removeSimulatedAgent: (clientId: number) => void;
}

const AwarenessCtx = createContext<AwarenessContextValue>({
  others: [],
  self: null,
  setCursor: () => {},
  setLocalState: () => {},
  addSimulatedAgent: () => {},
  updateSimulatedAgent: () => {},
  removeSimulatedAgent: () => {},
});

/**
 * Wrapper provider that merges real awareness data with simulated agent entries.
 * The simulated agents appear in PresenceAvatars and LiveCursors just like real users.
 */
export function AwarenessProvider({
  value,
  children,
}: {
  value: {
    others: OtherUser[];
    self: AwarenessUser | null;
    setCursor: (cursor: { x: number; y: number } | null) => void;
    setLocalState: (patch: Partial<AwarenessUser>) => void;
  };
  children: React.ReactNode;
}) {
  const [simulatedAgents, setSimulatedAgents] = useState<Map<number, OtherUser>>(
    new Map()
  );

  const addSimulatedAgent = useCallback((agent: OtherUser) => {
    setSimulatedAgents((prev) => {
      const next = new Map(prev);
      next.set(agent.clientId, agent);
      return next;
    });
  }, []);

  const updateSimulatedAgent = useCallback(
    (clientId: number, patch: Partial<OtherUser>) => {
      setSimulatedAgents((prev) => {
        const existing = prev.get(clientId);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(clientId, { ...existing, ...patch });
        return next;
      });
    },
    []
  );

  const removeSimulatedAgent = useCallback((clientId: number) => {
    setSimulatedAgents((prev) => {
      const next = new Map(prev);
      next.delete(clientId);
      return next;
    });
  }, []);

  // Merge real awareness + simulated agents
  const mergedOthers = useMemo(
    () => [...value.others, ...Array.from(simulatedAgents.values())],
    [value.others, simulatedAgents]
  );

  const ctxValue = useMemo(
    () => ({
      others: mergedOthers,
      self: value.self,
      setCursor: value.setCursor,
      setLocalState: value.setLocalState,
      addSimulatedAgent,
      updateSimulatedAgent,
      removeSimulatedAgent,
    }),
    [
      mergedOthers,
      value.self,
      value.setCursor,
      value.setLocalState,
      addSimulatedAgent,
      updateSimulatedAgent,
      removeSimulatedAgent,
    ]
  );

  return <AwarenessCtx.Provider value={ctxValue}>{children}</AwarenessCtx.Provider>;
}

export function useAwarenessContext() {
  return useContext(AwarenessCtx);
}
