"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import type { Editor } from "tldraw";
import { executeActions, serializeBoardState } from "@/lib/ai/executeActions";
import { useAwarenessContext } from "@/lib/AwarenessContext";

interface CommandBarProps {
  editor: Editor | null;
  boardId: string;
}

type AgentStatus = "idle" | "thinking" | "executing" | "done" | "error";

const QUICK_PROMPTS = [
  { label: "Brainstorm", prompt: "Brainstorm 8 creative ideas about" },
  { label: "Organize", prompt: "Look at the existing items on this board and organize them into logical groups" },
  { label: "Summarize", prompt: "Summarize everything on this board into a single overview" },
  { label: "Connect", prompt: "Find relationships between items on this board and draw arrows connecting related ideas" },
  { label: "Critique", prompt: "Review the ideas on this board and add notes about what's strong and what needs work" },
];

export function CommandBar({ editor, boardId }: CommandBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [actionCount, setActionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setLocalState } = useAwarenessContext();

  // Broadcast AI status to all users via awareness
  const broadcastAiStatus = useCallback(
    (aiStatus: "idle" | "thinking" | "executing" | null, aiPrompt?: string | null) => {
      setLocalState({ aiStatus, aiPrompt });
    },
    [setLocalState]
  );

  // Clean up reset timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut: Cmd/Ctrl + K to toggle
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSubmit = useCallback(
    async (overridePrompt?: string) => {
      const finalPrompt = overridePrompt || prompt;
      if (!finalPrompt.trim() || !editor) return;

      setStatus("thinking");
      setError(null);
      setReasoning(null);
      setActionCount(0);
      setProgress({ completed: 0, total: 0 });
      broadcastAiStatus("thinking", finalPrompt.trim().slice(0, 60));

      try {
        // Serialize current board state
        const boardState = serializeBoardState(editor);

        // Call AI API
        const res = await fetch("/api/ai/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            boardState,
            boardId,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "AI request failed");
        }

        setReasoning(data.reasoning || null);
        setActionCount(data.actionCount || 0);

        // Execute actions on the board
        if (data.actions && data.actions.length > 0) {
          setStatus("executing");
          broadcastAiStatus("executing", finalPrompt.trim().slice(0, 60));
          setProgress({ completed: 0, total: data.actions.length });

          await executeActions(editor, data.actions, (completed, total) => {
            setProgress({ completed, total });
          });
        }

        setStatus("done");
        setPrompt("");
        broadcastAiStatus(null, null);

        // Auto-reset status after a few seconds (clear any previous timer)
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setReasoning(null);
          resetTimerRef.current = null;
        }, 4000);
      } catch (err) {
        console.error("[CommandBar] Error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
        broadcastAiStatus(null, null);
      }
    },
    [prompt, editor, boardId]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-1/2 z-[999] -translate-x-1/2 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105 active:scale-95"
        title="AI Agent (⌘K)"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
          />
        </svg>
        AI Agent
        <kbd className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-[999] w-[560px] -translate-x-1/2">
      {/* Main panel */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-900/10">
        {/* Status bar */}
        {status !== "idle" && (
          <div
            className={`px-4 py-2 text-xs font-medium ${
              status === "thinking"
                ? "bg-violet-50 text-violet-700"
                : status === "executing"
                ? "bg-blue-50 text-blue-700"
                : status === "done"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status === "thinking" && (
                  <>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
                    AI is thinking...
                  </>
                )}
                {status === "executing" && (
                  <>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    Placing items on board... ({progress.completed}/
                    {progress.total})
                  </>
                )}
                {status === "done" && (
                  <>
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    Done! {actionCount} items added.
                  </>
                )}
                {status === "error" && (
                  <>
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                    {error}
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {status === "executing" && progress.total > 0 && (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${(progress.completed / progress.total) * 100}%`,
                  }}
                />
              </div>
            )}

            {/* Reasoning */}
            {reasoning && (status === "executing" || status === "done") && (
              <p className="mt-1 text-[11px] opacity-70">{reasoning}</p>
            )}
          </div>
        )}

        {/* Quick prompts */}
        <div className="flex gap-1.5 border-b border-gray-100 px-3 py-2">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              onClick={() => {
                setPrompt(qp.prompt);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="flex items-end gap-2 p-3">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to brainstorm, organize, summarize, connect ideas..."
            rows={2}
            disabled={status === "thinking" || status === "executing"}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200 disabled:opacity-50"
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleSubmit()}
              disabled={
                !prompt.trim() ||
                status === "thinking" ||
                status === "executing"
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm transition hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send (Enter)"
            >
              {status === "thinking" || status === "executing" ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-6 items-center justify-center rounded-lg text-[10px] text-gray-400 transition hover:text-gray-600"
              title="Close (Esc)"
            >
              esc
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
