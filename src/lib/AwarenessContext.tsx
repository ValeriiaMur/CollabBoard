"use client";

import { createContext, useContext } from "react";
import type { OtherUser, AwarenessUser } from "./useAwareness";

interface AwarenessContextValue {
  others: OtherUser[];
  self: AwarenessUser | null;
  setCursor: (cursor: { x: number; y: number } | null) => void;
  setLocalState: (patch: Partial<AwarenessUser>) => void;
}

const AwarenessCtx = createContext<AwarenessContextValue>({
  others: [],
  self: null,
  setCursor: () => {},
  setLocalState: () => {},
});

export const AwarenessProvider = AwarenessCtx.Provider;

export function useAwarenessContext() {
  return useContext(AwarenessCtx);
}
