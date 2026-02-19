import type { QuickPromptsProps } from "./types";

const QUICK_PROMPTS = [
  // Templates (supported by the agent's system prompt)
  { label: "SWOT", prompt: "Create a SWOT analysis with 4 frames and starter stickies for each quadrant" },
  { label: "Kanban", prompt: "Create a Kanban board with 4 columns: To Do, In Progress, Review, Done" },
  { label: "Retro", prompt: "Create a retrospective board with 3 frames: What Went Well, What Didn't, Action Items" },
  { label: "Pros/Cons", prompt: "Create a Pros and Cons board with green stickies for pros and red for cons" },
  // Action-based commands
  { label: "Add stickies", prompt: "Create 6 sticky notes with ideas about" },
  { label: "Add shapes", prompt: "Create a rectangle and 4 sticky notes inside it labeled" },
] as const;

export function QuickPrompts({ onSelect, inputRef }: QuickPromptsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-3 py-2">
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
