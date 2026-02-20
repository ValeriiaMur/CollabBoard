"use client";

import { useState, useCallback, useEffect } from "react";
import type { Editor } from "tldraw";
import { useAwarenessContext } from "@/lib/AwarenessContext";
import { AGENT_PERSONALITIES, PERSONALITY_IDS, type PersonalityId } from "@/lib/ai/personalities";
import { serializeBoardState } from "@/lib/ai/executeActions";
import { useAgentSimulation } from "@/lib/hooks/useAgentSimulation";
import { PersonalityCard } from "./PersonalityCard";

interface AgentPanelProps {
  editor: Editor | null;
  boardId: string;
}

const QUICK_PROMPTS = [
  { label: "Brainstorm ideas", prompt: "Brainstorm 10 creative ideas about what's on this board" },
  { label: "Organize the board", prompt: "Analyze and organize the existing content into clear categories" },
  { label: "Challenge our thinking", prompt: "Play devil's advocate and challenge the assumptions on this board" },
  { label: "Find connections", prompt: "Find unexpected connections between the ideas on this board" },
];

const AGENT_NAMES = Object.values(AGENT_PERSONALITIES).map((p) => p.name);

export function AgentPanel({ editor, boardId }: AgentPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPersonalities, setSelectedPersonalities] = useState<PersonalityId[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const { others, addSimulatedAgent, updateSimulatedAgent, removeSimulatedAgent } =
    useAwarenessContext();

  const { simulateAgent } = useAgentSimulation();

  // Active agents (filtered from awareness — includes simulated ones)
  const activeAgents = others.filter(
    (u) => AGENT_NAMES.includes(u.name) && u.aiStatus && u.aiStatus !== "idle"
  );

  // Keyboard shortcut: Cmd+Shift+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const togglePersonality = useCallback((id: PersonalityId) => {
    setSelectedPersonalities((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedPersonalities.length || !prompt.trim() || !editor) return;

    setIsSubmitting(true);
    setError(null);
    setLastResult(null);

    try {
      const boardState = serializeBoardState(editor);

      const res = await fetch("/api/agents/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          personalities: selectedPersonalities,
          prompt: prompt.trim(),
          boardState,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start agents");
      }

      const data = await res.json();

      // Simulate all agents in parallel — each one gets a cursor on the canvas
      const callbacks = {
        addAgent: addSimulatedAgent,
        updateAgent: updateSimulatedAgent,
        removeAgent: removeSimulatedAgent,
      };

      const simulations = data.agents.map(
        (agent: { personality: string; actions: unknown[]; error?: string }, idx: number) => {
          if (agent.error) {
            console.warn(`[AgentPanel] ${agent.personality} error:`, agent.error);
            return Promise.resolve(0);
          }
          if (!agent.actions || agent.actions.length === 0) {
            return Promise.resolve(0);
          }
          return simulateAgent(
            editor,
            agent.personality as PersonalityId,
            agent.actions as import("@/lib/ai/tools").BoardAction[],
            idx,
            callbacks
          );
        }
      );

      const results = await Promise.all(simulations);
      const totalExecuted = results.reduce((sum: number, n: number) => sum + n, 0);

      setLastResult(
        totalExecuted > 0
          ? `${data.agents.length} agent${data.agents.length > 1 ? "s" : ""} added ${totalExecuted} items!`
          : "Agents returned no actions — try a different prompt"
      );
      setPrompt("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start agents";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedPersonalities,
    prompt,
    editor,
    boardId,
    addSimulatedAgent,
    updateSimulatedAgent,
    removeSimulatedAgent,
    simulateAgent,
  ]);

  const handleQuickPrompt = useCallback(
    (quickPrompt: string) => {
      setPrompt(quickPrompt);
      // Auto-select all agents if none selected
      if (selectedPersonalities.length === 0) {
        setSelectedPersonalities([...PERSONALITY_IDS]);
      }
    },
    [selectedPersonalities]
  );

  // Floating button when panel is closed
  if (!isOpen) {
    return (
      <div className="fixed right-6 bottom-20 z-[998]">
        {/* Active agents indicator */}
        {activeAgents.length > 0 && (
          <div className="mb-2 rounded-full bg-violet-100 px-3 py-1 text-center text-xs font-medium text-violet-700">
            {activeAgents.length} agent{activeAgents.length > 1 ? "s" : ""} working...
          </div>
        )}
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg transition hover:shadow-xl hover:scale-105"
          title="Summon Agents (⌘⇧K)"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-6 bottom-6 z-[998] w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800">Summon Agents</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Personality selector */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {PERSONALITY_IDS.map((id) => (
          <PersonalityCard
            key={id}
            personality={AGENT_PERSONALITIES[id]}
            isSelected={selectedPersonalities.includes(id)}
            onToggle={() => togglePersonality(id)}
          />
        ))}
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-3 py-2">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.label}
            onClick={() => handleQuickPrompt(qp.prompt)}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600 transition hover:bg-violet-100 hover:text-violet-700"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 p-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask the agents to think about..."
          rows={2}
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />

        {/* Error / success */}
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
        {lastResult && (
          <p className="mt-1 text-xs text-green-600">{lastResult}</p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedPersonalities.length || !prompt.trim() || isSubmitting}
          className="mt-2 w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Summoning..."
            : `Summon ${selectedPersonalities.length || ""} Agent${selectedPersonalities.length !== 1 ? "s" : ""}`}
        </button>
      </div>

      {/* Active agents */}
      {activeAgents.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Active Agents
          </p>
          {activeAgents.map((agent) => (
            <div
              key={agent.clientId}
              className="flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              <div
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ backgroundColor: agent.color }}
              />
              <span className="text-xs font-medium text-gray-700">
                {agent.name}
              </span>
              <span className="text-[10px] text-gray-400">
                {agent.aiStatus === "thinking"
                  ? "thinking..."
                  : "creating on board..."}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
