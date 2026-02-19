"use client";

import { useAwarenessContext } from "@/lib/AwarenessContext";

/**
 * AiActivityIndicator
 *
 * Shows a magical floating pill when any user (including yourself)
 * is running an AI command. Other users see sparkle animations +
 * the user's name and a truncated prompt so everyone knows what's
 * happening on the board.
 */
export function AiActivityIndicator() {
  const { others, self } = useAwarenessContext();

  // Collect everyone who's actively using AI
  const aiUsers: { name: string; color: string; status: string; prompt?: string | null; isSelf: boolean }[] = [];

  if (self?.aiStatus && self.aiStatus !== "idle") {
    aiUsers.push({
      name: self.name || "You",
      color: self.color || "#8b5cf6",
      status: self.aiStatus,
      prompt: self.aiPrompt,
      isSelf: true,
    });
  }

  for (const other of others) {
    if (other.aiStatus && other.aiStatus !== "idle") {
      aiUsers.push({
        name: other.name || "Someone",
        color: other.color || "#8b5cf6",
        status: other.aiStatus,
        prompt: other.aiPrompt,
        isSelf: false,
      });
    }
  }

  if (aiUsers.length === 0) return null;

  return (
    <div className="fixed left-1/2 top-16 z-[998] -translate-x-1/2 flex flex-col gap-2">
      {aiUsers.map((user, i) => (
        <div
          key={`${user.name}-${i}`}
          className="ai-activity-pill group relative flex items-center gap-2.5 rounded-full border border-violet-200/60 bg-white/90 py-1.5 pl-2 pr-4 shadow-lg shadow-violet-500/10 backdrop-blur-md"
        >
          {/* Animated glow ring */}
          <div className="ai-glow absolute inset-0 rounded-full" />

          {/* Sparkle orb */}
          <div className="relative flex h-7 w-7 items-center justify-center">
            <div
              className="ai-orb absolute inset-0 rounded-full opacity-80"
              style={{ backgroundColor: user.color }}
            />
            <div className="ai-orb-ring absolute inset-[-3px] rounded-full border-2 border-violet-400/40" />
            {/* Sparkle particles */}
            <div className="sparkle sparkle-1" />
            <div className="sparkle sparkle-2" />
            <div className="sparkle sparkle-3" />
            <div className="sparkle sparkle-4" />
            <div className="sparkle sparkle-5" />
            <div className="sparkle sparkle-6" />
            {/* Center icon */}
            <svg className="relative z-10 h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>

          {/* Text content */}
          <div className="relative z-10 flex flex-col leading-none">
            <span className="text-[11px] font-semibold text-violet-700">
              {user.isSelf ? "You" : user.name}
              <span className="ml-1 font-normal text-violet-500">
                {user.status === "thinking" ? "summoning AI..." : "weaving magic..."}
              </span>
            </span>
            {user.prompt && (
              <span className="mt-0.5 max-w-[200px] truncate text-[10px] text-violet-400/80">
                &ldquo;{user.prompt}&rdquo;
              </span>
            )}
          </div>

          {/* Trailing sparkle dots */}
          <div className="trail-dot trail-dot-1" />
          <div className="trail-dot trail-dot-2" />
          <div className="trail-dot trail-dot-3" />
        </div>
      ))}
    </div>
  );
}
