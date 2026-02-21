"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Confetti } from "@/components/Confetti";

const CONFETTI_SESSION_KEY = "collabboard_confetti_shown";

interface BoardCollaborator {
  userId: string;
  userName: string;
  userImage: string | null;
  editedAt: string | null;
}

interface BoardSummary {
  id: string;
  name: string;
  updatedAt: string;
  thumbnailDataUrl?: string | null;
  collaborators?: BoardCollaborator[];
}

interface DashboardClientProps {
  boards: BoardSummary[];
  userName: string;
  userImage: string;
}

export function DashboardClient({
  boards: initialBoards,
  userName,
  userImage,
}: DashboardClientProps) {
  const router = useRouter();
  const [boards, setBoards] = useState(initialBoards);
  const [isCreating, setIsCreating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fire confetti once per login session
  useEffect(() => {
    if (!sessionStorage.getItem(CONFETTI_SESSION_KEY)) {
      setShowConfetti(true);
      sessionStorage.setItem(CONFETTI_SESSION_KEY, "1");
    }
  }, []);

  async function createBoard() {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Board" }),
      });
      if (!res.ok) throw new Error("Failed to create board");
      const board = await res.json();
      router.push(`/board/${board.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create board";
      setError(message);
      setIsCreating(false);
    }
  }

  async function deleteBoard(id: string) {
    if (!confirm("Delete this board? This cannot be undone.")) return;
    const prevBoards = boards;
    setError(null);
    setBoards((prev) => prev.filter((b) => b.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/boards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete board");
    } catch (err) {
      setBoards(prevBoards); // rollback on failure
      const message = err instanceof Error ? err.message : "Failed to delete board";
      setError(message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Error banner */}
      {error && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 shadow-md">
          {error}
          <button onClick={() => setError(null)} className="ml-3 font-medium hover:text-red-900">&times;</button>
        </div>
      )}
      {/* Confetti on first login */}
      {showConfetti && <Confetti />}

      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/header.png"
              alt="CollabBoard"
              className="h-8 w-auto"
            />
          </div>
          <div className="flex items-center gap-4">
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
            <button
              onClick={() => {
                // Clear confetti flag so it fires again on next sign-in
                sessionStorage.removeItem(CONFETTI_SESSION_KEY);
                signOut({ callbackUrl: "/" });
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Your Boards</h2>
          <button
            onClick={createBoard}
            disabled={isCreating}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "+ New Board"}
          </button>
        </div>

        {boards.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
              <svg
                className="h-6 w-6 text-brand-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900">
              No boards yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first collaborative whiteboard to get started.
            </p>
            <button
              onClick={createBoard}
              disabled={isCreating}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Create Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <div
                key={board.id}
                className="group relative rounded-xl border border-gray-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-md"
              >
                <button
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="block w-full text-left"
                >
                  {/* Board thumbnail or gradient placeholder */}
                  {board.thumbnailDataUrl ? (
                    <div className="mb-3 overflow-hidden rounded-lg border border-gray-100 bg-white">
                      <img
                        src={board.thumbnailDataUrl}
                        alt={`${board.name} preview`}
                        className="h-32 w-full object-contain bg-gray-50"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-blue-50">
                      <svg
                        className="h-8 w-8 text-brand-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm-10 9a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zm10-1a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z"
                        />
                      </svg>
                    </div>
                  )}

                  <h3 className="font-medium text-gray-900">{board.name}</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Updated{" "}
                    {new Date(board.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </button>

                {/* Collaborator avatars */}
                {board.collaborators && board.collaborators.length > 0 && (
                  <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-3">
                    <div className="flex -space-x-1.5">
                      {board.collaborators.slice(0, 4).map((collab) => (
                        <div
                          key={collab.userId}
                          title={collab.userName}
                        >
                          {collab.userImage ? (
                            <img
                              src={collab.userImage}
                              alt={collab.userName}
                              className="h-6 w-6 rounded-full border-2 border-white"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-100 text-[10px] font-medium text-brand-700">
                              {collab.userName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {board.collaborators.length > 4 && (
                      <span className="ml-1 text-xs text-gray-400">
                        +{board.collaborators.length - 4}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-gray-400">
                      {board.collaborators.length === 1
                        ? "1 editor"
                        : `${board.collaborators.length} editors`}
                    </span>
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBoard(board.id);
                  }}
                  className="absolute right-3 top-3 rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="Delete board"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
