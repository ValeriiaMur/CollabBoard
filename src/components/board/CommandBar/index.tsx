"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { executeActions, serializeBoardState } from "@/lib/ai/executeActions";
import { useAwarenessContext } from "@/lib/AwarenessContext";
import { StatusBar } from "./StatusBar";
import { QuickPrompts } from "./QuickPrompts";
import { InputArea } from "./InputArea";
import type { AgentStatus, CommandBarProps } from "./types";

/** Floating AI Agent trigger button (shown when panel is closed). */
function AgentButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 mb-20 left-1/2 z-[999] -translate-x-1/2 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105 active:scale-95"
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

export function CommandBar({ editor, boardId }: CommandBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [actionCount, setActionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { setLocalState } = useAwarenessContext();

  const broadcastAiStatus = useCallback(
    (
      aiStatus: "idle" | "thinking" | "executing" | null,
      aiPrompt?: string | null,
    ) => {
      setLocalState({ aiStatus, aiPrompt });
    },
    [setLocalState],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      abortControllerRef.current?.abort();
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

      // Abort any in-flight request (deduplication)
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setStatus("thinking");
      setError(null);
      setReasoning(null);
      setActionCount(0);
      setProgress({ completed: 0, total: 0 });
      setDurationMs(null);
      broadcastAiStatus("thinking", finalPrompt.trim().slice(0, 60));

      try {
        const boardState = serializeBoardState(editor);

        const res = await fetch("/api/ai/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalPrompt, boardState, boardId }),
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "AI request failed");
        }

        setReasoning(data.reasoning || null);
        setActionCount(data.actionCount || 0);
        setDurationMs(data.durationMs ?? null);

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

        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setReasoning(null);
          resetTimerRef.current = null;
        }, 4000);
      } catch (err) {
        // Ignore abort errors (user submitted new request)
        if (err instanceof DOMException && err.name === "AbortError") return;

        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
        broadcastAiStatus(null, null);
      }
    },
    [prompt, editor, boardId, broadcastAiStatus],
  );

  if (!isOpen) {
    return <AgentButton onClick={() => setIsOpen(true)} />;
  }

  const isProcessing = status === "thinking" || status === "executing";

  return (
    <div className="fixed bottom-6 left-1/2 z-[999] w-[560px] -translate-x-1/2">
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-900/10">
        <StatusBar
          status={status}
          actionCount={actionCount}
          durationMs={durationMs}
          progress={progress}
          reasoning={reasoning}
          error={error}
        />
        <QuickPrompts onSelect={setPrompt} inputRef={inputRef} />
        <InputArea
          prompt={prompt}
          setPrompt={setPrompt}
          onSubmit={() => handleSubmit()}
          onClose={() => setIsOpen(false)}
          disabled={isProcessing}
          loading={isProcessing}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
