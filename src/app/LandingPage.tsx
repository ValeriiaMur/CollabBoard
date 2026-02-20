"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════
   CollabBoard — Production Landing Page
   Inspired by Apple's spatial design + Dribbble polish.
   Shows off real-time collab, AI command bar, and multi-agent system.
   ═══════════════════════════════════════════════════════════════════ */

// ── Intersection-observer fade-in hook ─────────────────────────────
function useFadeIn<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("land-visible");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

// ── Animated gradient blob background ──────────────────────────────
function GradientBlobs() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
    </div>
  );
}

// ── Feature card ───────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  gradient: string;
}) {
  const ref = useFadeIn<HTMLDivElement>();
  return (
    <div ref={ref} className="land-fade feature-card group">
      <div
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
    </div>
  );
}

// ── Agent personality pill ─────────────────────────────────────────
function AgentPill({
  name,
  avatar,
  color,
  delay,
}: {
  name: string;
  avatar: string;
  color: string;
  delay: number;
}) {
  const ref = useFadeIn<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="land-fade flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{ boxShadow: `0 0 0 2px ${color}` }}
      >
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{name}</p>
        <p className="text-xs text-gray-400">AI Agent</p>
      </div>
    </div>
  );
}

// ── Floating cursor animation for hero ─────────────────────────────
function FloatingCursors() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Cursor 1 */}
      <div className="floating-cursor cursor-1">
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
          <path d="M0 0L16 12L8 12L4 20L0 0Z" fill="#6366f1" />
        </svg>
        <span className="ml-1 rounded-md bg-indigo-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
          Alex
        </span>
      </div>
      {/* Cursor 2 */}
      <div className="floating-cursor cursor-2">
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
          <path d="M0 0L16 12L8 12L4 20L0 0Z" fill="#ec4899" />
        </svg>
        <span className="ml-1 rounded-md bg-pink-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
          Sam
        </span>
      </div>
      {/* Cursor 3 — Agent */}
      <div className="floating-cursor cursor-3">
        <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full ring-2 ring-violet-400 shadow-lg">
          <img
            src="/images/Analyst.png"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <span className="ml-1 rounded-md bg-violet-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
          Analyst AI
        </span>
      </div>
    </div>
  );
}

// ── Main Landing Page ──────────────────────────────────────────────
export function LandingPage() {
  const heroRef = useFadeIn<HTMLDivElement>();
  const agentRef = useFadeIn<HTMLDivElement>();
  const [typedText, setTypedText] = useState("");
  const fullText = "Brainstorm product ideas for Q3";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 55);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="landing-page relative min-h-screen overflow-x-hidden bg-[#fafbff]">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/logo-192.png"
              alt="CollabBoard"
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-lg font-bold tracking-tight text-gray-900">
              Collab<span className="text-indigo-500">Board</span>
            </span>
          </div>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-gray-700 hover:shadow-lg active:scale-95"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center px-6 pt-16">
        <GradientBlobs />
        <FloatingCursors />

        <div
          ref={heroRef}
          className="land-fade relative z-10 mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-4 py-1.5 text-xs font-medium text-indigo-600 backdrop-blur-sm mt-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            </span>
            Powered by AI Agents
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Think together.
            <br />
            <span className="hero-gradient-text">Build faster.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-gray-500">
            A real-time collaborative whiteboard where humans and AI agents work
            side by side — brainstorming, organizing, and creating on an
            infinite canvas.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="group relative overflow-hidden rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-200 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Collaborating
                <svg
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>
            </button>
            <a
              href="#features"
              className="rounded-full border border-gray-200 bg-white px-8 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:scale-95"
            >
              See Features
            </a>
          </div>

          {/* Hero image — the user's gif */}
          <div className="relative mx-auto mt-16 max-w-lg">
            <div className="hero-glow" />
            <div className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-white shadow-2xl shadow-gray-200/50">
              <img
                src="https://cdn.dribbble.com/userupload/19580535/file/original-246fa0b6a302830070007a9d74a14fe9.gif"
                alt="CollabBoard in action"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof bar ─────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white/50 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 text-center text-sm text-gray-400">
          <span className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-800">3</span>
            AI Agent Personalities
          </span>
          <span className="hidden h-4 w-px bg-gray-200 sm:block" />
          <span className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-800">13</span>
            Board Action Types
          </span>
          <span className="hidden h-4 w-px bg-gray-200 sm:block" />
          <span className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-800">&lt;2s</span>
            AI Response Time
          </span>
          <span className="hidden h-4 w-px bg-gray-200 sm:block" />
          <span className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-800">500+</span>
            Objects at 60fps
          </span>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────── */}
      <section id="features" className="relative py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-500">
              Features
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to collaborate
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              }
              title="AI Command Bar"
              desc="Type natural language commands and watch GPT-4o-mini generate stickies, shapes, frames, and entire board templates in seconds."
            />
            <FeatureCard
              gradient="linear-gradient(135deg, #ec4899, #f472b6)"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM6.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              }
              title="AI Agent Collaboration"
              desc="Summon AI personalities that appear as real collaborators — their cursors glide across the canvas as they brainstorm, critique, and organize."
            />
            <FeatureCard
              gradient="linear-gradient(135deg, #14b8a6, #2dd4bf)"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
              }
              title="Real-Time Multiplayer"
              desc="See teammates' cursors, presence, and edits instantly. Yjs CRDT sync ensures zero conflicts even with 5+ concurrent editors."
            />
            <FeatureCard
              gradient="linear-gradient(135deg, #f59e0b, #fbbf24)"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              }
              title="Infinite Canvas"
              desc="Powered by tldraw — draw, write, add shapes, sticky notes, frames, and arrows on a zoomable infinite whiteboard."
            />
            <FeatureCard
              gradient="linear-gradient(135deg, #3b82f6, #60a5fa)"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.25 9.879"
                  />
                </svg>
              }
              title="External Bot API"
              desc="Invite external agents via API keys. Any bot that speaks JSON can add content to your board — perfect for CI/CD pipelines and integrations."
            />
            <FeatureCard
              gradient="linear-gradient(135deg, #8b5cf6, #a78bfa)"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              }
              title="Langfuse Observability"
              desc="Every AI call is traced with latency, cost, and session metadata. Monitor performance and debug issues in real time."
            />
          </div>
        </div>
      </section>

      {/* ── AI Command Bar Demo ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-gray-950 py-28 px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden="true"
        >
          <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-indigo-500/30 blur-[100px]" />
          <div className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-violet-500/30 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-400">
            AI Command Bar
          </p>
          <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Describe it. Watch it appear.
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-gray-400">
            Type a natural language prompt and the AI generates structured board
            actions — stickies, shapes, templates, and more — validated and
            placed in milliseconds.
          </p>

          {/* Fake command bar */}
          <div className="mx-auto max-w-lg">
            <div className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900 shadow-2xl shadow-indigo-500/10">
              <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20">
                  <svg
                    className="h-3.5 w-3.5 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-400">
                  AI Command
                </span>
              </div>
              <div className="px-4 py-5">
                <p className="text-left font-mono text-sm text-gray-200">
                  {typedText}
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-400" />
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-gray-800 px-4 py-2.5">
                <span className="text-[11px] text-gray-600">GPT-4o-mini</span>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
                  13 action types
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Agents Section ────────────────────────────────── */}
      <section className="relative py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left — text */}
            <div ref={agentRef} className="land-fade">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-500">
                Multi-Agent System
              </p>
              <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                AI teammates that feel real
              </h2>
              <p className="mb-8 text-gray-500 leading-relaxed">
                Summon AI agents with distinct personalities. Each agent appears
                as a collaborator on the canvas — you can see their cursor move,
                watch them think, and see shapes materialize as they work. It
                feels like pairing with another human.
              </p>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </span>
                  Animated cursor simulation — agents glide across the canvas
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </span>
                  Personality-driven responses for diverse perspectives
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </span>
                  External bot API — invite any agent via API key
                </div>
              </div>
            </div>

            {/* Right — agent cards */}
            <div className="flex flex-col gap-4">
              <AgentPill
                name="The Analyst"
                avatar="/images/Analyst.png"
                color="#3b82f6"
                delay={0}
              />
              <AgentPill
                name="The Creative"
                avatar="/images/Creative.png"
                color="#ec4899"
                delay={120}
              />
              <AgentPill
                name="The Critic"
                avatar="/images/Critic.png"
                color="#f59e0b"
                delay={240}
              />
              {/* Powered by badge */}
              <div className="mt-2 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-400">
                <span className="font-mono">Claude Haiku 4.5</span>
                <span className="h-3 w-px bg-gray-200" />
                <span>Structured output + Zod validation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="relative py-28 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Ready to collaborate with AI?
          </h2>
          <p className="mb-10 text-gray-500">
            Create your first board in seconds. No credit card required.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="group inline-flex items-center gap-2 rounded-full bg-indigo-600 px-10 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-200 active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="currentColor"
                fillOpacity={0.7}
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="currentColor"
                fillOpacity={0.5}
              />
            </svg>
            Continue with Google
            <svg
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-xs text-gray-400">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo-192.png"
              alt=""
              className="h-5 w-5 rounded opacity-50"
            />
            <span>CollabBoard</span>
          </div>
          <span>Built with AI Agents</span>
        </div>
      </footer>
    </div>
  );
}
