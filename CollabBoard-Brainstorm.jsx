import { useState } from "react";

const STATUS = {
  done: { label: "Done", color: "bg-emerald-500", text: "text-emerald-100" },
  missing: { label: "Missing", color: "bg-red-500", text: "text-red-100" },
  partial: { label: "Partial", color: "bg-amber-500", text: "text-amber-100" },
  vision: { label: "Vision", color: "bg-violet-500", text: "text-violet-100" },
};

const gapAnalysis = [
  {
    category: "MVP Board (Gauntlet Req.)",
    items: [
      { name: "Infinite board with pan/zoom", status: "done", note: "tldraw handles this out of the box" },
      { name: "Sticky notes with editable text", status: "done", note: "tldraw note tool" },
      { name: "Shapes (rect, circle, line, arrow)", status: "done", note: "Full tldraw toolbar available" },
      { name: "Create, move, edit objects", status: "done", note: "All tldraw interactions work" },
      { name: "Real-time sync (2+ users)", status: "done", note: "Yjs + PartyKit CRDT sync" },
      { name: "Multiplayer cursors + name labels", status: "done", note: "LiveCursors.tsx via Yjs awareness" },
      { name: "Presence awareness (who's online)", status: "done", note: "PresenceAvatars.tsx" },
      { name: "User authentication", status: "done", note: "NextAuth — Google + GitHub OAuth" },
      { name: "Deployed & publicly accessible", status: "done", note: "Firebase App Hosting + PartyKit" },
    ],
  },
  {
    category: "AI Board Agent (Gauntlet Req.)",
    items: [
      { name: "Natural language command processing", status: "missing", note: "No AI integration exists yet — this is the biggest gap" },
      { name: "Create sticky notes via AI", status: "missing", note: "Need: parse prompt → call tldraw editor.createShape()" },
      { name: "Organize/layout items via AI", status: "missing", note: "Need: read board state → compute positions → batch move" },
      { name: "Summarize board content", status: "missing", note: "Need: extract all text from shapes → LLM summarize → place result" },
      { name: "Generate ideas (brainstorm)", status: "missing", note: "Need: LLM generates ideas → create multiple stickies" },
      { name: "Group related items", status: "missing", note: "Need: semantic clustering → reposition + frame/color-code" },
      { name: "Create connections between items", status: "missing", note: "Need: identify relationships → create arrow shapes" },
      { name: "Visual feedback during AI ops", status: "missing", note: "Loading states, progress indication, animation" },
      { name: "Context-aware (reads board state)", status: "missing", note: "Need: serialize tldraw store → send to LLM as context" },
      { name: "Error handling + friendly messages", status: "missing", note: "Graceful fallbacks when AI fails" },
    ],
  },
  {
    category: "Submission Deliverables",
    items: [
      { name: "Demo video (3–5 min)", status: "missing", note: "Show board + AI agent + collab in action" },
      { name: "AI development log", status: "missing", note: "Document how AI was used to build the project" },
      { name: "AI cost analysis", status: "missing", note: "Track API costs, token usage, model choices" },
      { name: "Social post (X / LinkedIn)", status: "partial", note: "Share button exists — but you need an actual post" },
    ],
  },
  {
    category: "Nice-to-Have Polish",
    items: [
      { name: "Board rename from dashboard", status: "done", note: "PATCH /api/boards/[id] exists" },
      { name: "Delete deprecated files", status: "partial", note: "prisma.ts, liveblocks.ts, liveblocks-auth route still lingering" },
      { name: "Frames (group visual sections)", status: "partial", note: "tldraw has frame tool — just not highlighted in your UI" },
      { name: "Canvas export / download", status: "missing", note: "tldraw has export APIs — could add as menu option" },
      { name: "Board templates", status: "missing", note: "Pre-populated boards (retro, brainstorm, kanban)" },
    ],
  },
];

const agentVision = {
  tagline: "Give agents an idea. They think visually on a board.",
  concept: "CollabBoard evolves from a human whiteboard into a multi-agent visual thinking space. Agents don't just respond with text — they create, arrange, connect, and debate ideas spatially on the canvas.",
  starterAgents: [
    {
      name: "Spark",
      emoji: "⚡",
      color: "from-amber-400 to-orange-500",
      role: "The Ideator",
      strength: "Divergent thinking — generates many ideas fast",
      behavior: "When given a prompt, Spark floods the board with 8–12 sticky notes in a radial burst pattern. Each sticky is a distinct angle on the idea. Spark thinks wide, not deep.",
      commands: ["brainstorm [topic]", "more ideas like [this sticky]", "wild card (surprise angle)"],
    },
    {
      name: "Atlas",
      emoji: "🗺️",
      color: "from-blue-400 to-indigo-500",
      role: "The Organizer",
      strength: "Structure & systems thinking — finds order in chaos",
      behavior: "Atlas reads the board, groups related stickies into clusters, creates frames around them with labels, draws connections/arrows between related groups, and can suggest a visual hierarchy or flow.",
      commands: ["organize this board", "group similar ideas", "create a flow from [A] to [B]", "find gaps"],
    },
    {
      name: "Sage",
      emoji: "🔍",
      color: "from-emerald-400 to-teal-500",
      role: "The Critic",
      strength: "Analytical depth — challenges and refines",
      behavior: "Sage reviews existing stickies and adds 'challenge' notes (red-tinted) next to weak ideas, 'build on this' notes (green-tinted) next to strong ones, and summary cards that synthesize the best thinking into actionable next steps.",
      commands: ["critique these ideas", "summarize the board", "what's missing?", "prioritize"],
    },
  ],
  inviteAgent: {
    concept: "An 'Invite Agent' link that lets you bring in a custom agent — either from a marketplace or by configuring your own (name, system prompt, visual style, allowed tools).",
    flow: [
      "Click '+ Invite Agent' button on the board",
      "Choose from agent marketplace OR create custom",
      "Custom: set name, avatar, system prompt, and tool permissions",
      "Agent joins the board with its own cursor + color",
      "Agent appears in the presence bar alongside human collaborators",
    ],
  },
  interaction: {
    howItWorks: [
      "You drop a 'prompt sticky' (special type) onto the board with your idea",
      "Tag one or more agents: @Spark @Atlas @Sage",
      "Agents 'think' with a visible typing/working animation",
      "They place their output on the board — stickies, frames, arrows, text",
      "Agents can see and respond to EACH OTHER's output (multi-turn visual debate)",
      "You curate: drag to keep, delete to discard, annotate to redirect",
    ],
  },
  techApproach: [
    {
      phase: "Phase 1 — Single AI Agent (Gauntlet MVP)",
      items: [
        "Add a command bar / chat panel on the board",
        "Wire up an API route: /api/ai/command",
        "Serialize board state (tldraw store → JSON) as LLM context",
        "LLM returns structured actions: { type: 'create_sticky', text: '...', position: {x, y} }",
        "Execute actions against tldraw editor API → syncs to all users via Yjs",
        "Start with OpenAI gpt-4o or Anthropic Claude — whichever you prefer",
      ],
    },
    {
      phase: "Phase 2 — Multi-Agent Architecture",
      items: [
        "Each agent = { name, systemPrompt, color, avatar, toolPermissions }",
        "Agents share the same Yjs doc — their edits sync like any other user",
        "Agent 'presence' shows in PresenceAvatars (with a bot badge)",
        "Agent cursors animate to show where they're 'working' on the board",
        "Agents can read the full board context before acting",
        "Turn-based or parallel execution modes",
      ],
    },
    {
      phase: "Phase 3 — Agent Marketplace + Custom Agents",
      items: [
        "Agent config stored in Firestore: agents collection",
        "Invite link generates a URL with agent config embedded",
        "Marketplace: browse community-created agent personas",
        "Custom agent builder: name + system prompt + tool selection",
        "Rate limiting & cost controls per agent",
        "Agent memory: optionally persist across board sessions",
      ],
    },
  ],
};

function Badge({ status }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color} ${s.text}`}>
      {s.label}
    </span>
  );
}

function AgentCard({ agent }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-xl border border-white/10 overflow-hidden cursor-pointer transition-all hover:border-white/20"
      onClick={() => setExpanded(!expanded)}
    >
      <div className={`bg-gradient-to-r ${agent.color} p-4`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{agent.emoji}</span>
          <div>
            <h4 className="text-white font-bold text-lg">{agent.name}</h4>
            <p className="text-white/80 text-sm">{agent.role}</p>
          </div>
        </div>
      </div>
      <div className="bg-zinc-800 p-4">
        <p className="text-zinc-300 text-sm mb-2"><span className="text-white font-semibold">Strength:</span> {agent.strength}</p>
        {expanded && (
          <div className="mt-3 space-y-3 animate-in">
            <p className="text-zinc-400 text-sm">{agent.behavior}</p>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Commands</p>
              <div className="flex flex-wrap gap-1">
                {agent.commands.map((cmd, i) => (
                  <code key={i} className="bg-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded">{cmd}</code>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="text-zinc-500 text-xs mt-2">{expanded ? "Click to collapse" : "Click to expand"}</p>
      </div>
    </div>
  );
}

export default function CollabBoardBrainstorm() {
  const [activeTab, setActiveTab] = useState("gaps");

  const doneCount = gapAnalysis.flatMap(c => c.items).filter(i => i.status === "done").length;
  const missingCount = gapAnalysis.flatMap(c => c.items).filter(i => i.status === "missing").length;
  const totalCount = gapAnalysis.flatMap(c => c.items).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">CollabBoard — Roadmap & Vision</h1>
          <p className="text-zinc-400 text-sm mt-1">From MVP → Multi-Agent Visual Thinking Platform</p>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-sm text-zinc-400">
              <span className="text-emerald-400 font-bold">{doneCount}</span>/{totalCount} done · <span className="text-red-400 font-bold">{missingCount}</span> missing
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { id: "gaps", label: "Gap Analysis" },
              { id: "agents", label: "Agent Vision" },
              { id: "roadmap", label: "Technical Roadmap" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-zinc-900"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* GAP ANALYSIS TAB */}
        {activeTab === "gaps" && (
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
              <h2 className="text-lg font-bold text-amber-400 mb-2">Bottom Line</h2>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Your MVP board features are <span className="text-emerald-400 font-semibold">100% complete</span> — canvas, shapes, stickies, real-time sync, cursors, presence, auth, deployment. All done.
                The <span className="text-red-400 font-semibold">entire AI Board Agent requirement is unbuilt</span> — that's 10 items covering natural language commands, board manipulation, and visual feedback.
                This is the critical path for the Gauntlet submission. Everything else is polish.
              </p>
            </div>

            {gapAnalysis.map((category, ci) => (
              <div key={ci}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {category.category}
                  <span className="text-xs text-zinc-500 font-normal">
                    ({category.items.filter(i => i.status === "done").length}/{category.items.length} done)
                  </span>
                </h3>
                <div className="space-y-2">
                  {category.items.map((item, ii) => (
                    <div key={ii} className="flex items-start gap-3 bg-zinc-900/50 border border-white/5 rounded-lg px-4 py-3">
                      <Badge status={item.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200">{item.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AGENT VISION TAB */}
        {activeTab === "agents" && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-violet-900/30 to-indigo-900/30 border border-violet-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-1">{agentVision.tagline}</h2>
              <p className="text-zinc-300 text-sm leading-relaxed">{agentVision.concept}</p>
            </div>

            {/* Starter Agents */}
            <div>
              <h3 className="text-lg font-semibold mb-4">3 Starter Agents</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agentVision.starterAgents.map((agent, i) => (
                  <AgentCard key={i} agent={agent} />
                ))}
              </div>
            </div>

            {/* How It Works */}
            <div>
              <h3 className="text-lg font-semibold mb-3">How Agents Work on the Board</h3>
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 space-y-3">
                {agentVision.interaction.howItWorks.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <p className="text-sm text-zinc-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Agent */}
            <div>
              <h3 className="text-lg font-semibold mb-3">+ Invite Agent</h3>
              <div className="bg-zinc-900 border border-dashed border-violet-500/30 rounded-xl p-5">
                <p className="text-zinc-300 text-sm mb-3">{agentVision.inviteAgent.concept}</p>
                <div className="space-y-2">
                  {agentVision.inviteAgent.flow.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                      <span className="text-violet-400">→</span> {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TECHNICAL ROADMAP TAB */}
        {activeTab === "roadmap" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
              <h2 className="text-lg font-bold text-blue-400 mb-2">Strategy: Build in Layers</h2>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Phase 1 gets you through the Gauntlet — a single AI agent with a command bar that manipulates the board.
                Phase 2 turns that into a multi-agent system where each agent is just a different config (system prompt + color + tools).
                Phase 3 opens it up to the world. Each phase builds directly on the last — no throwaway code.
              </p>
            </div>

            {agentVision.techApproach.map((phase, pi) => (
              <div key={pi} className="relative">
                <div className={`rounded-xl border overflow-hidden ${
                  pi === 0 ? "border-red-500/30 bg-red-950/10" : pi === 1 ? "border-violet-500/20 bg-violet-950/10" : "border-zinc-700 bg-zinc-900/30"
                }`}>
                  <div className={`px-5 py-3 border-b ${
                    pi === 0 ? "border-red-500/20 bg-red-500/10" : pi === 1 ? "border-violet-500/10 bg-violet-500/5" : "border-zinc-700 bg-zinc-800/50"
                  }`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{phase.phase}</h3>
                      {pi === 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">PRIORITY — Do This Now</span>}
                      {pi === 1 && <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">Your Vision</span>}
                      {pi === 2 && <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">Future</span>}
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    {phase.items.map((item, ii) => (
                      <div key={ii} className="flex items-start gap-2 text-sm text-zinc-300">
                        <span className="text-zinc-500 mt-0.5">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Key Architecture Decisions */}
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-3">Key Architecture Insight</h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-3">
                The leap from Phase 1 → Phase 2 is actually small if you design Phase 1 right. Here's the trick:
              </p>
              <div className="bg-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-300 space-y-1">
                <p className="text-zinc-500">// Phase 1: single agent config</p>
                <p>{`const agent = {`}</p>
                <p>{`  name: "AI Assistant",`}</p>
                <p>{`  systemPrompt: "You help organize a whiteboard...",`}</p>
                <p>{`  color: "#8B5CF6",`}</p>
                <p>{`  tools: ["create_sticky", "move_shape", "create_arrow", ...]`}</p>
                <p>{`}`}</p>
                <p className="text-zinc-500 mt-2">// Phase 2: same code, different configs</p>
                <p>{`const agents = [spark, atlas, sage]`}</p>
                <p className="text-zinc-500">// Each agent is just a different { name, systemPrompt, color, tools }</p>
                <p className="text-zinc-500">// The execution engine is identical.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
