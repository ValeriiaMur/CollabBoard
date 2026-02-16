"use client";

import { useAwarenessContext } from "@/lib/AwarenessContext";
import { useEditor } from "tldraw";

/**
 * Renders other users' cursors on the tldraw canvas.
 * Uses Yjs awareness (via AwarenessContext) to get cursor positions
 * in page coordinates, then converts to screen coordinates via tldraw's editor.
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

        return (
          <div
            key={other.clientId}
            className="pointer-events-none absolute left-0 top-0"
            style={{
              transform: `translate(${screenPoint.x}px, ${screenPoint.y}px)`,
              transition: "transform 50ms linear",
            }}
          >
            {/* Cursor SVG */}
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
          </div>
        );
      })}
    </>
  );
}
