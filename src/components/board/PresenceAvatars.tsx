"use client";

import { useAwarenessContext } from "@/lib/AwarenessContext";

/**
 * Shows who's currently online on the board.
 * Displays avatar circles with user initials and colors.
 * Reads from Yjs awareness via AwarenessContext.
 *
 * Satisfies MVP requirement: "Presence awareness (who's online)"
 */
export function PresenceAvatars() {
  const { others, self } = useAwarenessContext();

  return (
    <div className="flex items-center gap-1">
      {/* Online indicator */}
      <span className="mr-2 text-xs text-gray-400">
        {1 + others.length} online
      </span>

      {/* Current user */}
      {self && (
        <div className="relative" title={`${self.name} (you)`}>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white shadow-sm"
            style={{ backgroundColor: self.color || "#999" }}
          >
            {getInitials(self.name || "?")}
          </div>
          {/* "You" indicator dot */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
        </div>
      )}

      {/* Other users */}
      {others.map((other) => {
        const name = other.name || "Anonymous";
        const color = other.color || "#999";

        return (
          <div key={other.clientId} className="relative -ml-1" title={name}>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              {getInitials(name)}
            </div>
            {/* Online dot */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
          </div>
        );
      })}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
