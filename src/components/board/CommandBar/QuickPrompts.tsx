import type { QuickPromptsProps } from "./types";

const QUICK_PROMPTS = [
  // Templates (now use compound create_template tool)
  { label: "SWOT", prompt: "Create a SWOT analysis template" },
  { label: "Kanban", prompt: "Create a Kanban board" },
  { label: "Retro", prompt: "Create a retrospective board" },
  { label: "Pros/Cons", prompt: "Create a Pros and Cons comparison" },
  { label: "Timeline", prompt: "Create a timeline" },
  { label: "Mind Map", prompt: "Create a mind map about" },
  { label: "Empathy Map", prompt: "Create an empathy map" },
  { label: "Journey Map", prompt: "Create a user journey map" },
  // Flowcharts / processes
  { label: "Flowchart", prompt: "Create a flowchart for" },
  { label: "Decision Tree", prompt: "Create a decision tree for" },
  // General actions
  { label: "Brainstorm", prompt: "Brainstorm ideas about" },
  { label: "Organize", prompt: "Organize the existing items on the board into groups" },
  { label: "Summarize", prompt: "Summarize everything on the board" },
  { label: "Compare", prompt: "Compare" },
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
