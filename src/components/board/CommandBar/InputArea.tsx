import { type KeyboardEvent, type DragEvent, type ClipboardEvent, useState, useCallback } from "react";
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
  const [isDragOver, setIsDragOver] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Handle paste — accept plain text, rich text (strip HTML), and file contents
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const clipboardData = e.clipboardData;

      // Check for plain text (handles bullet points, lists, CSV, etc.)
      const text = clipboardData.getData("text/plain");
      if (text && text.trim()) {
        // Let the default paste behavior handle it — the textarea will receive the text
        return;
      }
    },
    []
  );

  // Handle drag-and-drop of text files and plain text
  const handleDragOver = useCallback((e: DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      // Handle dropped text
      const droppedText = e.dataTransfer.getData("text/plain");
      if (droppedText) {
        setPrompt(prompt ? `${prompt}\n${droppedText}` : droppedText);
        return;
      }

      // Handle dropped files (text files, CSV, JSON, markdown)
      const files = Array.from(e.dataTransfer.files);
      const textFile = files.find((f) =>
        f.type.startsWith("text/") ||
        f.name.endsWith(".csv") ||
        f.name.endsWith(".json") ||
        f.name.endsWith(".md") ||
        f.name.endsWith(".txt")
      );

      if (textFile) {
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          // Prepend a hint about the file type
          const prefix = textFile.name.endsWith(".csv")
            ? "Here is CSV data, put it on the board:\n"
            : textFile.name.endsWith(".json")
              ? "Here is JSON data, visualize it on the board:\n"
              : "Put this content on the board:\n";
          setPrompt(prefix + content.slice(0, 8000)); // Cap at 8k chars
        };
        reader.readAsText(textFile);
      }
    },
    [prompt, setPrompt]
  );

  return (
    <div className="flex items-end gap-2 p-3">
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        placeholder='Try "create a sticky" or "create a SWOT analysis"'
        rows={2}
        disabled={disabled}
        className={`flex-1 resize-none rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200 disabled:opacity-50 transition ${
          isDragOver
            ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
            : "border-gray-200"
        }`}
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
