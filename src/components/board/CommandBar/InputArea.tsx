import type { KeyboardEvent } from "react";
import type { InputAreaProps } from "./types";

function SendIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function Spinner() {
  return <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />;
}

export function InputArea({ prompt, setPrompt, onSubmit, onClose, disabled, loading, inputRef }: InputAreaProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3">
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='Try: "Create a SWOT analysis" or "Add 5 sticky notes about marketing ideas"'
        rows={2}
        disabled={disabled}
        className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200 disabled:opacity-50"
      />
      <div className="flex flex-col gap-1">
        <button
          onClick={onSubmit}
          disabled={!prompt.trim() || disabled}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm transition hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send (Enter)"
        >
          {loading ? <Spinner /> : <SendIcon />}
        </button>
        <button
          onClick={onClose}
          className="flex h-6 items-center justify-center rounded-lg text-[10px] text-gray-400 transition hover:text-gray-600"
          title="Close (Esc)"
        >
          esc
        </button>
      </div>
    </div>
  );
}
