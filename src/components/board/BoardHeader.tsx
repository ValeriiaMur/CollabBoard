"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface BoardHeaderProps {
  boardId: string;
  userName: string;
  userImage: string;
}

interface BotInvite {
  botId: string;
  name: string;
  apiKey: string;
  boardId: string;
}

export function BoardHeader({
  boardId,
  userName,
  userImage,
}: BoardHeaderProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [botName, setBotName] = useState("");
  const [createdBot, setCreatedBot] = useState<BotInvite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [endpointCopied, setEndpointCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close share menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    }
    if (shareOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [shareOpen]);

  // Close invite dialog on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setInviteOpen(false);
      }
    }
    if (inviteOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [inviteOpen]);

  const boardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/board/${boardId}`
      : "";

  const botEndpoint =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/agents/bot-action`
      : "";

  function copyLink() {
    navigator.clipboard.writeText(boardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareOnX() {
    const text = encodeURIComponent("Check out this CollabBoard!");
    const url = encodeURIComponent(boardUrl);
    window.open(
      `https://x.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener",
    );
    setShareOpen(false);
  }

  function shareOnLinkedIn() {
    const url = encodeURIComponent(boardUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "noopener",
    );
    setShareOpen(false);
  }

  const createBotInvite = useCallback(async () => {
    if (!botName.trim()) return;
    setInviteLoading(true);
    setInviteError(null);

    try {
      const res = await fetch("/api/agents/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, name: botName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create bot invite");
      }

      const data = await res.json();
      setCreatedBot(data);
      setBotName("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setInviteLoading(false);
    }
  }, [botName, boardId]);

  function copyApiKey() {
    if (!createdBot) return;
    navigator.clipboard.writeText(createdBot.apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  function copyEndpoint() {
    navigator.clipboard.writeText(botEndpoint);
    setEndpointCopied(true);
    setTimeout(() => setEndpointCopied(false), 2000);
  }

  return (
    <>
    <header className="relative z-50 shrink-0 border-b border-gray-200/60 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Logo + Back to Dashboard */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-gray-100"
            title="Back to Dashboard"
          >
            <img
              src="/images/header.png"
              alt="CollabBoard"
              className="h-7 w-auto"
            />
          </button>

          {/* Separator */}
          <div className="h-5 w-px bg-gray-200" />

          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Dashboard
          </button>
        </div>

        {/* Right: Share + Invite Agent + User + Sign Out */}
        <div className="flex items-center gap-3">
          {/* Invite Agent button */}
          <button
            onClick={() => {
              setInviteOpen(true);
              setCreatedBot(null);
              setInviteError(null);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm text-violet-700 transition hover:bg-violet-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Agent
          </button>

          {/* Share button + dropdown */}
          <div className="relative" ref={shareRef}>
            <button
              onClick={() => setShareOpen(!shareOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
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
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>

            {shareOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                {/* Copy Link */}
                <button
                  onClick={copyLink}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  {copied ? "Copied!" : "Copy Link"}
                </button>

                <div className="mx-3 my-1 border-t border-gray-100" />

                {/* Share on X */}
                <button
                  onClick={shareOnX}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  <svg
                    className="h-4 w-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </button>

                {/* Share on LinkedIn */}
                <button
                  onClick={shareOnLinkedIn}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  <svg
                    className="h-4 w-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Share on LinkedIn
                </button>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="h-5 w-px bg-gray-200" />

          {/* User info */}
          <div className="flex items-center gap-2">
            {userImage && (
              <img
                src={userImage}
                alt={userName}
                className="h-7 w-7 rounded-full"
              />
            )}
            <span className="text-sm text-gray-600">{userName}</span>
          </div>

          {/* Sign Out */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            Sign Out
          </button>
        </div>
      </div>

    </header>

      {/* Invite Agent Dialog — portaled to body so it renders above everything */}
      {inviteOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            ref={dialogRef}
            className="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Invite External Agent</h2>
              <button
                onClick={() => setInviteOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!createdBot ? (
              <>
                <p className="mb-4 text-sm text-gray-500">
                  Create an API key so an external bot or agent can join this board and add content.
                </p>

                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Bot name
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createBotInvite()}
                  placeholder="e.g. ClawBot, ResearchAgent..."
                  className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  autoFocus
                />

                {inviteError && (
                  <p className="mb-3 text-sm text-red-500">{inviteError}</p>
                )}

                <button
                  onClick={createBotInvite}
                  disabled={!botName.trim() || inviteLoading}
                  className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {inviteLoading ? "Creating..." : "Generate API Key"}
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="mb-1 text-sm font-medium text-green-800">
                    Bot &quot;{createdBot.name}&quot; created!
                  </p>
                  <p className="text-xs text-green-600">
                    Save this API key now — it won&apos;t be shown again.
                  </p>
                </div>

                {/* API Key */}
                <label className="mb-1 block text-xs font-medium text-gray-500">API Key</label>
                <div className="mb-3 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-800">
                    {createdBot.apiKey}
                  </code>
                  <button
                    onClick={copyApiKey}
                    className="shrink-0 rounded-md border border-gray-200 px-2 py-2 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {keyCopied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Endpoint */}
                <label className="mb-1 block text-xs font-medium text-gray-500">Endpoint</label>
                <div className="mb-4 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-800">
                    POST {botEndpoint}
                  </code>
                  <button
                    onClick={copyEndpoint}
                    className="shrink-0 rounded-md border border-gray-200 px-2 py-2 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {endpointCopied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Usage example */}
                <details className="mb-4">
                  <summary className="cursor-pointer text-xs font-medium text-violet-600 hover:text-violet-700">
                    Show usage example
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-green-400">
{`curl -X POST ${botEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${createdBot.apiKey}" \\
  -d '{
    "boardId": "${boardId}",
    "actions": [
      {
        "type": "create_sticky",
        "text": "Hello from my bot!",
        "position": { "x": 100, "y": 100 },
        "color": "violet"
      }
    ]
  }'`}
                  </pre>
                </details>

                <button
                  onClick={() => setInviteOpen(false)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
