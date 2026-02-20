"use client";

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
 * Renders other users' cursors on the tldraw canvas.
 * Uses Yjs awareness (via AwarenessContext) to get cursor positions
 * in page coordinates, then converts to screen coordinates via tldraw's editor.
 *
 * Agent cursors get a slower transition (400ms ease-out) so they glide
 * smoothly across the canvas, mimicking a real user drawing.
 *
 * Rendered via tldraw's `InFrontOfTheCanvas` slot — no direct props allowed,
 * so awareness data is consumed from React context.
 */
export function LiveCursors() {
  const { others } = useAwarenessContext();
  const editor = useEditor();

  return (
    <>
      {others.map((other) => {
        if (!other.cursor) return null;

        // Convert page coordinates to screen coordinates
        const screenPoint = editor.pageToScreen({
          x: other.cursor.x,
          y: other.cursor.y,
        });

        const name = other.name || "Anonymous";
        const color = other.color || "#999";
        const isAgent = AGENT_NAMES.has(name);
        const agentAvatar = AGENT_AVATARS[name];

        return (
          <div
            key={other.clientId}
            className="pointer-events-none absolute left-0 top-0"
            style={{
              transform: `translate(${screenPoint.x}px, ${screenPoint.y}px)`,
              // Agents glide smoothly; real users snap quickly
              transition: isAgent
                ? "transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                : "transform 50ms linear",
            }}
          >
            {isAgent ? (
              <>
                {/* Agent avatar cursor — rounded avatar with a glowing ring */}
                <div
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 shadow-lg"
                  style={{
                    boxShadow: `0 0 0 2px ${color}, 0 0 12px 2px ${color}40, 0 2px 8px rgba(0,0,0,0.15)`,
                  }}
                >
                  {agentAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={agentAvatar} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {name[4]}
                    </div>
                  )}
                </div>
                {/* Agent name label */}
                <div
                  className="absolute left-9 top-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {name}
                </div>
              </>
            ) : (
              <>
                {/* Regular user cursor SVG */}
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

                {/* Name label */}
                <div
                  className="absolute left-5 top-4 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {name}
                </div>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
