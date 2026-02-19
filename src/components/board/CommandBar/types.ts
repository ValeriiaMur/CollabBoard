export type AgentStatus = "idle" | "thinking" | "executing" | "done" | "error";

export interface CommandBarProps {
  editor: import("tldraw").Editor | null;
  boardId: string;
}

export interface StatusBarProps {
  status: AgentStatus;
  actionCount: number;
  durationMs: number | null;
  progress: { completed: number; total: number };
  reasoning: string | null;
  error: string | null;
}

export interface QuickPromptsProps {
  onSelect: (prompt: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export interface InputAreaProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  disabled: boolean;
  loading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}
