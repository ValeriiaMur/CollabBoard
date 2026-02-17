"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface BoardHeaderProps {
  boardId: string;
  userName: string;
  userImage: string;
}

export function BoardHeader({
  boardId,
  userName,
  userImage,
}: BoardHeaderProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

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

  const boardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/board/${boardId}`
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

  return (
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

        {/* Right: Share + User + Sign Out */}
        <div className="flex items-center gap-3">
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
  );
}
