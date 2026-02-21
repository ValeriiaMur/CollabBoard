"use client";

import { memo, useMemo } from "react";
import { useAwarenessContext } from "@/lib/AwarenessContext";
import { useEditor } from "tldraw";

/** Agent names that get smooth cursor gliding */
const AGENT_NAMES = new Set(["The Analyst", "The Creative", "The Critic"]);

/** Agent name → avatar image for cursor display */
const AGENT_AVATARS: Record<string, string> = {
  "The Analyst": "/images/Analyst.png",
  "The Creative": "/images/Creative.png",
  "The Critic": "/images/Critic.png",
};

/**
 * A single cursor — memoized to only re-render when its own data changes.
 * Prevents the entire cursor list from re-rendering when one cursor moves.
 */
const CursorItem = memo(function CursorItem({
  x,
  y,
  name,
  color,
}: {
  x: number;
  y: number;
  name: string;
  color: string;
}) {
  const isAgent = AGENT_NAMES.has(name);
  const agentAvatar = AGENT_AVATARS[name];

  // Pre-compute styles to avoid recreating objects each render
  const transformStyle = useMemo(
    () => ({
      transform: `translate(${x}px, ${y}px)`,
      transition: isAgent
        ? "transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        : "transform 50ms linear",
    }),
    [x, y, isAgent]
  );

  const glowStyle = useMemo(
    () =>
      isAgent
        ? {
            boxShadow: `0 0 0 2px ${color}, 0 0 12px 2px ${color}40, 0 2px 8px rgba(0,0,0,0.15)`,
          }
        : undefined,
    [color, isAgent]
  );

  const labelStyle = useMemo(
    () => ({ backgroundColor: color }),
    [color]
  );

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={transformStyle}
    >
      {isAgent ? (
        <>
          <div
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 shadow-lg"
            style={glowStyle}
          >
            {agentAvatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={agentAvatar}
                alt={name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                style={labelStyle}
              >
                {name[4]}
              </div>
            )}
          </div>
          <div
            className="absolute left-9 top-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm"
            style={labelStyle}
          >
            {name}
          </div>
        </>
      ) : (
        <>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.3))" }}
          >
            <path
              d="M5.65 2.65L19.5 12.85L12.65 13.65L9.35 21.35L5.65 2.65Z"
              fill={color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <div
            className="absolute left-5 top-4 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm"
            style={labelStyle}
          >
            {name}
          </div>
        </>
      )}
    </div>
  );
});

/**
 * Renders other users' cursors on the tldraw canvas.
 * Each cursor is individually memoized so only the moving cursor re-renders.
 */
export const LiveCursors = memo(function LiveCursors() {
  const { others } = useAwarenessContext();
  const editor = useEditor();

  const cursorData = useMemo(
    () =>
      others
        .filter((o) => o.cursor)
        .map((other) => {
          const screenPoint = editor.pageToScreen({
            x: other.cursor!.x,
            y: other.cursor!.y,
          });
          return {
            clientId: other.clientId,
            x: screenPoint.x,
            y: screenPoint.y,
            name: other.name || "Anonymous",
            color: other.color || "#999",
          };
        }),
    [others, editor]
  );

  return (
    <>
      {cursorData.map((cursor) => (
        <CursorItem
          key={cursor.clientId}
          x={cursor.x}
          y={cursor.y}
          name={cursor.name}
          color={cursor.color}
        />
      ))}
    </>
  );
});
