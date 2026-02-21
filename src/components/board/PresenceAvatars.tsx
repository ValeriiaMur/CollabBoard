"use client";

import { memo, useMemo } from "react";
import { useAwarenessContext } from "@/lib/AwarenessContext";

/** Agent name → avatar image mapping */
const AGENT_AVATARS: Record<string, string> = {
  "The Analyst": "/images/Analyst.png",
  "The Creative": "/images/Creative.png",
  "The Critic": "/images/Critic.png",
};

/** Memoized single avatar — only re-renders when its own props change */
const AvatarItem = memo(function AvatarItem({
  name,
  color,
  aiStatus,
}: {
  name: string;
  color: string;
  aiStatus?: string | null;
}) {
  const agentAvatar = AGENT_AVATARS[name];
  const isAgent = !!agentAvatar;

  return (
    <div className="relative -ml-1" title={name}>
      <div
        className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white ring-2 shadow-sm ${
          isAgent ? "ring-violet-300" : "ring-white"
        }`}
        style={{ backgroundColor: isAgent ? undefined : color }}
      >
        {isAgent ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={agentAvatar}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          getInitials(name)
        )}
      </div>
      <div
        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
          isAgent && aiStatus && aiStatus !== "idle"
            ? "animate-pulse bg-violet-500"
            : "bg-green-400"
        }`}
      />
    </div>
  );
});

/**
 * Shows who's currently online on the board.
 * Memoized at both the list and individual item level.
 */
export const PresenceAvatars = memo(function PresenceAvatars() {
  const { others, self } = useAwarenessContext();
  const onlineCount = useMemo(() => 1 + others.length, [others.length]);

  return (
    <div className="flex items-center gap-1">
      <span className="mr-2 text-xs text-gray-400">
        {onlineCount} online
      </span>

      {self && (
        <div className="relative" title={`${self.name} (you)`}>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white shadow-sm"
            style={{ backgroundColor: self.color || "#999" }}
          >
            {getInitials(self.name || "?")}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
        </div>
      )}

      {others.map((other) => (
        <AvatarItem
          key={other.clientId}
          name={other.name || "Anonymous"}
          color={other.color || "#999"}
          aiStatus={other.aiStatus}
        />
      ))}
    </div>
  );
});

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
