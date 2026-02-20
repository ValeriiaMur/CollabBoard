"use client";

import { useAwarenessContext } from "@/lib/AwarenessContext";

/** Agent name → avatar image mapping */
const AGENT_AVATARS: Record<string, string> = {
  "The Analyst": "/images/Analyst.png",
  "The Creative": "/images/Creative.png",
  "The Critic": "/images/Critic.png",
};

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
        const agentAvatar = AGENT_AVATARS[name];
        const isAgent = !!agentAvatar;

        return (
          <div key={other.clientId} className="relative -ml-1" title={name}>
            <div
              className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white ring-2 shadow-sm ${
                isAgent ? "ring-violet-300" : "ring-white"
              }`}
              style={{ backgroundColor: isAgent ? undefined : color }}
            >
              {isAgent ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={agentAvatar} alt={name} className="h-full w-full object-cover" />
              ) : (
                getInitials(name)
              )}
            </div>
            {/* Online / AI status dot */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                isAgent && other.aiStatus && other.aiStatus !== "idle"
                  ? "animate-pulse bg-violet-500"
                  : "bg-green-400"
              }`}
            />
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
