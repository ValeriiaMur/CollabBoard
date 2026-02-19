import type { QuickPromptsProps } from "./types";

const QUICK_PROMPTS = [
  { label: "Brainstorm", prompt: "Brainstorm 8 creative ideas about" },
  { label: "Organize", prompt: "Look at the existing items on this board and organize them into logical groups" },
  { label: "Summarize", prompt: "Summarize everything on this board into a single overview" },
  { label: "Connect", prompt: "Find relationships between items on this board and draw arrows connecting related ideas" },
  { label: "Critique", prompt: "Review the ideas on this board and add notes about what's strong and what needs work" },
] as const;

export function QuickPrompts({ onSelect, inputRef }: QuickPromptsProps) {
  return (
    <div className="flex gap-1.5 border-b border-gray-100 px-3 py-2">
      {QUICK_PROMPTS.map((qp) => (
        <button
          key={qp.label}
          onClick={() => {
            onSelect(qp.prompt);
            inputRef.current?.focus();
          }}
          className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
        >
          {qp.label}
        </button>
      ))}
    </div>
  );
}
