import type { StatusBarProps } from "./types";

const STATUS_STYLES = {
  thinking: "bg-violet-50 text-violet-700",
  executing: "bg-blue-50 text-blue-700",
  done: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
} as const;

const PULSE_COLORS = {
  thinking: "bg-violet-500",
  executing: "bg-blue-500",
} as const;

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

export function StatusBar({ status, actionCount, durationMs, progress, reasoning, error }: StatusBarProps) {
  if (status === "idle") return null;

  return (
    <div className={`px-4 py-2 text-xs font-medium ${STATUS_STYLES[status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "thinking" && (
            <>
              <div className={`h-2 w-2 animate-pulse rounded-full ${PULSE_COLORS.thinking}`} />
              AI is thinking...
            </>
          )}
          {status === "executing" && (
            <>
              <div className={`h-2 w-2 animate-pulse rounded-full ${PULSE_COLORS.executing}`} />
              Placing items on board... ({progress.completed}/{progress.total})
            </>
          )}
          {status === "done" && (
            <>
              <CheckIcon />
              Done! {actionCount} items added
              {durationMs != null && (
                <span className="ml-1 opacity-70">({(durationMs / 1000).toFixed(1)}s)</span>
              )}
            </>
          )}
          {status === "error" && (
            <>
              <ErrorIcon />
              {error}
            </>
          )}
        </div>
      </div>

      {status === "executing" && progress.total > 0 && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-blue-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          />
        </div>
      )}

      {reasoning && (status === "executing" || status === "done") && (
        <p className="mt-1 text-[11px] opacity-70">{reasoning}</p>
      )}
    </div>
  );
}
